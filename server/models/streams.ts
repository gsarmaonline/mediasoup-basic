import { DataTypes } from "sequelize";
import { sequelize } from ".";

export const Stream = sequelize.define("stream", {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  path: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.ENUM("pending", "started", "terminated"),
    defaultValue: "pending",
  },
});

export const StreamJoiner = sequelize.define("stream_joiner", {
  joinerType: {
    type: DataTypes.ENUM("viewer", "streamer"),
    allowNull: false,
  },
  streamId: {
    type: DataTypes.INTEGER,
    references: {
      model: Stream,
      key: "id",
    },
    allowNull: false,
  },
  userEmail: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

Stream.hasMany(StreamJoiner, {
  foreignKey: "streamId",
  as: "joiners",
});

StreamJoiner.belongsTo(Stream, {
  foreignKey: "streamId",
  as: "stream",
});
