import { google } from "googleapis";
import { User } from "../models/User";
import { env } from "../config/environment";
import { Logger } from "../utils/logger";
import { AuthenticationError, NotFoundError } from "../utils/errors";
import { generateToken } from "../utils/jwt";

const oauth2Client = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_CALLBACK_URL
);

export class AuthService {
  static getAuthUrl(): string {
    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://mail.google.com/",
      ],
      prompt: "consent",
    });
  }

  static async handleCallback(
    code: string
  ): Promise<{ user: User; token: string }> {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      if (!userInfo.data.email || !userInfo.data.id) {
        throw new AuthenticationError(
          "Failed to get user information from Google"
        );
      }

      // Find or create user
      const [user, created] = await User.findOrCreate({
        where: { google_id: userInfo.data.id },
        defaults: {
          google_id: userInfo.data.id,
          email: userInfo.data.email,
          name: userInfo.data.name || userInfo.data.email,
          picture: userInfo.data.picture!,
          access_token: tokens.access_token!,
          refresh_token: tokens.refresh_token!,
          token_expiry: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : undefined,
          is_active: true, 
        },
      });

      if (!created) {
        // Update existing user's tokens
        await user.update({
          access_token: tokens.access_token!,
          refresh_token: tokens.refresh_token!,
          token_expiry: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : undefined,
          is_active: true,
        });
      }

      const token = generateToken({ userId: user.id, email: user.email });

      Logger.info(
        `User ${user.email} ${
          created ? "registered" : "logged in"
        } successfully`
      );

      return { user, token };
    } catch (error) {
      Logger.error("Error in Google OAuth callback:", error);
      throw new AuthenticationError("Authentication failed");
    }
  }

  static async refreshAccessToken(userId: number): Promise<string> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (!user.refresh_token) {
      throw new AuthenticationError("No refresh token available");
    }

    try {
      oauth2Client.setCredentials({
        refresh_token: user.refresh_token,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();

      await user.update({
        access_token: credentials.access_token!,
        token_expiry: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : undefined,
      });

      return credentials.access_token!;
    } catch (error) {
      Logger.error("Error refreshing access token:", error);
      throw new AuthenticationError("Failed to refresh access token");
    }
  }

  static async logout(userId: number): Promise<void> {
    const user = await User.findByPk(userId);
    if (user) {
      await user.update({
        access_token: "",
        refresh_token: "",
        token_expiry: null!,
        is_active: false,
      });
      Logger.info(`User ${user.email} logged out`);
    }
  }
}
