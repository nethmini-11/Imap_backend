import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";
import { User } from "./User";

interface EmailAttributes {
  id: number;
  user_id: number;
  message_id: string;
  thread_id: string;
  subject: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  body_text?: string;
  body_html?: string;
  date: Date;
  has_attachments: boolean;
  is_read: boolean;
  labels: string[];
  snippet?: string;
  created_at: Date;
  updated_at: Date;
}

interface EmailCreationAttributes
  extends Optional<
    EmailAttributes,
    | "id"
    | "cc"
    | "bcc"
    | "body_text"
    | "body_html"
    | "snippet"
    | "created_at"
    | "updated_at"
  > {}

export class Email
  extends Model<EmailAttributes, EmailCreationAttributes>
  implements EmailAttributes
{
  public id!: number;
  public user_id!: number;
  public message_id!: string;
  public thread_id!: string;
  public subject!: string;
  public from!: string;
  public to!: string;
  public cc?: string;
  public bcc?: string;
  public body_text?: string;
  public body_html?: string;
  public date!: Date;
  public has_attachments!: boolean;
  public is_read!: boolean;
  public labels!: string[];
  public snippet?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Email.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    message_id: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    thread_id: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    subject: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    from: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    to: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    cc: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    bcc: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    body_text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    body_html: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    has_attachments: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    labels: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    snippet: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "emails",
    sequelize,
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["message_id"],
      },
      {
        fields: ["thread_id"],
      },
      {
        fields: ["date"],
      },
      {
        fields: ["is_read"],
      },
      {
        type: "FULLTEXT",
        fields: ["subject", "from", "to", "body_text"],
      },
    ],
  }
);

User.hasMany(Email, { foreignKey: "user_id", as: "emails" });
Email.belongsTo(User, { foreignKey: "user_id", as: "user" });
