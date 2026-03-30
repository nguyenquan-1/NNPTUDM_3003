var express = require("express");
var router = express.Router();

let mongoose = require("mongoose");
let messageModel = require("../schemas/messages");
let { checkLogin } = require("../utils/authHandler");

/**
 * GET /messages/:userId
 * Lấy toàn bộ message giữa user hiện tại và userId
 */
router.get("/:userId", checkLogin, async function (req, res, next) {
  try {
    let currentUserId = req.userId;
    let otherUserId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      res.status(400).send({ message: "userId khong hop le" });
      return;
    }

    let messages = await messageModel
      .find({
        isDeleted: false,
        $or: [
          { from: currentUserId, to: otherUserId },
          { from: otherUserId, to: currentUserId },
        ],
      })
      .populate("from", "username email fullName avatarUrl")
      .populate("to", "username email fullName avatarUrl")
      .sort({ createdAt: 1 });

    res.send(messages);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

/**
 * POST /messages/:userId
 * Gửi tin nhắn cho userId
 *
 * body text:
 * {
 *   "content": "xin chao"
 * }
 *
 * body file:
 * {
 *   "content": "http://localhost:3000/upload/abc.jpg",
 *   "type": "file"
 * }
 *
 * nếu không truyền type thì mặc định là text
 */
router.post("/:userId", checkLogin, async function (req, res, next) {
  try {
    let currentUserId = req.userId;
    let otherUserId = req.params.userId;
    let { type, content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      res.status(400).send({ message: "userId khong hop le" });
      return;
    }

    if (!content || content.trim() === "") {
      res.status(400).send({ message: "noi dung khong duoc rong" });
      return;
    }

    let finalType = type === "file" ? "file" : "text";

    let newMessage = new messageModel({
      from: currentUserId,
      to: otherUserId,
      contentMessage: {
        type: finalType,
        content: content,
      },
    });

    await newMessage.save();

    let result = await messageModel
      .findById(newMessage._id)
      .populate("from", "username email fullName avatarUrl")
      .populate("to", "username email fullName avatarUrl");

    res.send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

/**
 * GET /messages
 * Lấy message cuối cùng của mỗi user
 * mà user hiện tại đã nhắn hoặc người khác nhắn cho user hiện tại
 */
router.get("/", checkLogin, async function (req, res, next) {
  try {
    let currentUserId = new mongoose.Types.ObjectId(req.userId);

    let result = await messageModel.aggregate([
      {
        $match: {
          isDeleted: false,
          $or: [{ from: currentUserId }, { to: currentUserId }],
        },
      },
      {
        $addFields: {
          partnerId: {
            $cond: [{ $eq: ["$from", currentUserId] }, "$to", "$from"],
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: "$partnerId",
          lastMessage: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: "$lastMessage",
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    result = await messageModel.populate(result, [
      { path: "from", select: "username email fullName avatarUrl" },
      { path: "to", select: "username email fullName avatarUrl" },
    ]);

    res.send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

module.exports = router;