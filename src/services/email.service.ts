import Imap, { Config } from "imap";
import { simpleParser } from "mailparser";
import { User, Email } from "../models";
import { env } from "../config/environment";
import { Logger } from "../utils/logger";
import { AuthService } from "./auth.service";
import { NotFoundError, AppError } from "../utils/errors";
import { Op } from "sequelize";

interface EmailSearchOptions {
  page?: number;
  limit?: number;
  search?: string;
  unreadOnly?: boolean;
}

export class EmailService {
  private static createImapConnection(
    email: string,
    accessToken: string
  ): Imap {
    const xoauth2String = Buffer.from(
      `user=${email}\u0001auth=Bearer ${accessToken}\u0001\u0001`,
      "utf-8"
    ).toString("base64");

    const imapConfig: Config = {
      user: email,
      xoauth2: xoauth2String,
      password: "",
      host: "imap.gmail.com",
      port: 993,
      tls: true,
      authTimeout: 30000,
      tlsOptions: {
        rejectUnauthorized: false,
      },
      keepalive: true,
      connTimeout: 30000,
    };

    const imap = new Imap(imapConfig);

    imap.once("ready", () => {
      console.log("✅ IMAP Connection ready!");
    });

    imap.once("error", (error: Error) => {
      console.error("❌ IMAP Connection Error:", error);
      if (error.message.includes("Invalid credentials")) {
        console.error(
          "🔐 Check if the access token is valid and IMAP is enabled in Gmail settings."
        );
      }
    });

    return imap;
  }

  static async syncEmails(
    userId: number
  ): Promise<{ synced: number; total: number }> {
    const user = await User.findByPk(userId);
    if (!user) {
      console.error("❌ User not found during sync");
      throw new NotFoundError("User not found");
    }

    let accessToken = user.access_token;

    // Check if token needs refresh
    if (user.token_expiry && user.token_expiry < new Date()) {
      console.log("🔄 Token expired, refreshing...");
      accessToken = await AuthService.refreshAccessToken(userId);
    } else {
      console.log("✅ Token is still valid");
    }

    const imap = this.createImapConnection(user.email, accessToken);

    return new Promise((resolve, reject) => {
      imap.once("ready", () => {
        this.fetchEmails(imap, user.id)
          .then((result) => {
            console.log("✅ Email fetch completed:", result);
            imap.end();
            resolve(result);
          })
          .catch((error) => {
            console.error("❌ Email fetch failed:", error);
            imap.end();
            reject(error);
          });
      });

      imap.once("error", (error: Error) => {
        reject(new AppError(`IMAP connection error: ${error.message}`));
      });

      imap.connect();
    });
  }

  private static async fetchEmails(
    imap: Imap,
    userId: number
  ): Promise<{ synced: number; total: number }> {

    return new Promise((resolve, reject) => {
      imap.openBox("INBOX", true, (error, box) => {
        if (error) {
          return reject(new AppError(`Failed to open inbox: ${error.message}`));
        }

        const totalEmails = box.messages.total;
        const batchSize = 50;
        let syncedCount = 0;

        const fetchBatch = async (start: number, end: number) => {
          const f = imap.fetch(`${start}:${end}`, {
            bodies: "",
            struct: true,
          });

          f.on("message", (msg) => {
            let attributes: any;
            let parts: any[] = [];
            let headers: any = {};

            msg.on("body", (stream, info) => {});

            msg.on("attributes", (attrs) => {
              attributes = attrs;
              console.log("🏷️ Attributes received");
            });

            msg.on("end", async () => {
              try {
                // Fetch the full email content using the attributes
                await this.fetchFullEmail(imap, attributes, userId);
                syncedCount++;
                console.log(`✅ Processed email ${syncedCount}/${totalEmails}`);
              } catch (error) {
                console.error("❌ Error processing email:", error);
              }
            });
          });

          f.on("error", (error) => {
            console.error("❌ Error fetching emails:", error);
          });

          f.on("end", async () => {
            console.log(`✅ Batch ${start}-${end} completed`);
            const nextStart = end + 1;
            if (nextStart <= totalEmails) {
              const nextEnd = Math.min(nextStart + batchSize - 1, totalEmails);
              fetchBatch(nextStart, nextEnd);
            } else {
              await User.update(
                { last_sync_at: new Date() },
                { where: { id: userId } }
              );
              resolve({ synced: syncedCount, total: totalEmails });
            }
          });
        };

        const start = Math.max(1, totalEmails - batchSize + 1);
        fetchBatch(start, totalEmails);
      });
    });
  }

  private static async fetchFullEmail(
    imap: Imap,
    attributes: any,
    userId: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const f = imap.fetch(attributes.uid, {
        bodies: [""],
        struct: true,
      });

      f.on("message", (msg) => {
        let emailData = "";
        let headerData = "";

        msg.on("body", (stream, info) => {
          let buffer = "";
          stream.on("data", (chunk) => {
            buffer += chunk.toString("utf8");
          });
          stream.on("end", () => {
            if (info.which === "HEADER") {
              headerData = buffer;
            } else {
              emailData = buffer;
            }
          });
        });

        msg.on("end", async () => {
          try {
            const parsed = await simpleParser(emailData);

            const messageId = attributes["x-gm-msgid"] || parsed.messageId;
            if (!messageId) {
              console.warn("⚠️ No message ID found, skipping email");
              return resolve();
            }

            // Check if email already exists
            const existingEmail = await Email.findOne({
              where: { user_id: userId, message_id: messageId },
            });

            if (existingEmail) {
              console.log("📭 Email already exists, skipping");
              return resolve();
            }

            // Extract headers for additional metadata
            const headers = Imap.parseHeader(headerData);

            await Email.create({
              user_id: userId,
              message_id: messageId,
              thread_id: attributes["x-gm-thrid"] || messageId,
              subject: parsed.subject || "(No Subject)",
              from: this.formatAddress(parsed.from),
              to: this.formatAddress(parsed.to),
              cc: this.formatAddress(parsed.cc),
              bcc: this.formatAddress(parsed.bcc),
              body_text: parsed.text || "",
              body_html: parsed.html || "",
              date: parsed.date || new Date(attributes.date),
              has_attachments:
                parsed.attachments && parsed.attachments.length > 0,
              is_read: !!(
                attributes.flags &&
                (attributes.flags.includes("\\Seen") ||
                  attributes.flags.includes("SEEN"))
              ),
              labels: attributes["x-gm-labels"] || [],
              snippet: parsed.text?.substring(0, 200) || parsed.subject || "",
            });

            resolve();
          } catch (error) {
            console.error("❌ Error processing full email:", error);
            reject(error);
          }
        });
      });

      f.on("error", (error) => {
        console.error("❌ Error fetching full email:", error);
        reject(error);
      });
    });
  }

 


  // Helper method to format email addresses
  private static formatAddress(address: any): string {
    if (!address) return "";

    if (Array.isArray(address)) {
      return address
        .map((addr) => {
          if (addr.name && addr.address) {
            return `${addr.name} <${addr.address}>`;
          }
          return addr.address || addr.name || "";
        })
        .join(", ");
    }

    if (address.name && address.address) {
      return `${address.name} <${address.address}>`;
    }

    return address.address || address.name || "";
  }

  static async getEmails(
    userId: number,
    options: EmailSearchOptions = {}
  ): Promise<{ emails: Email[]; total: number; page: number; limit: number }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const offset = (page - 1) * limit;

    const whereClause: any = { user_id: userId };

    if (options.unreadOnly) {
      whereClause.is_read = false;
    }

    if (options.search) {
      whereClause[Op.or] = [
        { subject: { [Op.like]: `%${options.search}%` } },
        { from: { [Op.like]: `%${options.search}%` } },
        { to: { [Op.like]: `%${options.search}%` } },
        { body_text: { [Op.like]: `%${options.search}%` } },
      ];
    }

    const { count, rows } = await Email.findAndCountAll({
      where: whereClause,
      order: [["date", "DESC"]],
      limit,
      offset,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name", "email"],
        },
      ],
    });

    return {
      emails: rows,
      total: count,
      page,
      limit,
    };
  }

  static async getEmailById(userId: number, emailId: number): Promise<Email> {
    const email = await Email.findOne({
      where: { id: emailId, user_id: userId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name", "email"],
        },
      ],
    });

    if (!email) {
      throw new NotFoundError("Email not found");
    }

    // Mark as read when retrieved
    if (!email.is_read) {
      await email.update({ is_read: true });
    }

    return email;
  }

  static async markAsRead(userId: number, emailId: number): Promise<Email> {
    const email = await Email.findOne({
      where: { id: emailId, user_id: userId },
    });

    if (!email) {
      throw new NotFoundError("Email not found");
    }

    return await email.update({ is_read: true });
  }

  static async getEmailStats(
    userId: number
  ): Promise<{ total: number; unread: number; read: number }> {
    const total = await Email.count({ where: { user_id: userId } });
    const unread = await Email.count({
      where: { user_id: userId, is_read: false },
    });
    const read = total - unread;

    return { total, unread, read };
  }
}
