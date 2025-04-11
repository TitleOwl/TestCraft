import React, { useState, useEffect } from "react";
import axios from "axios";
import "./CSS/Comment.css";  // ปรับแต่ง CSS สำหรับ Comment
import trash_comment from "../image/trash_comment.png";  // ไอคอนลบคอมเมนต์

const Comment = ({ verificationId }) => {
  const [comments, setComments] = useState([]); // เก็บข้อมูลคอมเมนต์
  const [newComment, setNewComment] = useState(""); // เก็บคอมเมนต์ใหม่ที่ต้องการโพสต์
  const [replyComment, setReplyComment] = useState(""); // เก็บข้อความที่ตอบกลับ
  const [selectedCommentId, setSelectedCommentId] = useState(null); // เก็บ ID ของคอมเมนต์ที่เลือกตอบกลับ
  const [loading, setLoading] = useState(true); // สถานะการโหลดคอมเมนต์
  const [loggedInUser, setLoggedInUser] = useState(""); // ชื่อผู้ใช้งานที่ล็อกอิน
  const [error, setError] = useState(""); // ข้อความข้อผิดพลาด

  // ดึงข้อมูลผู้ใช้งานจาก localStorage
  useEffect(() => {
    const fetchLoggedInUser = () => {
      const username = localStorage.getItem("username"); // ชื่อผู้ใช้งาน
      setLoggedInUser(username || "Guest");
    };

    fetchLoggedInUser();
  }, []);

  // ดึงคอมเมนต์ที่เชื่อมโยงกับ verification_id
  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:3001/allcomment", {
        params: { verification_id: verificationId }, // ส่ง verification_id ไปใน query string
      });
      setComments(response.data); // ตั้งค่าคอมเมนต์ที่ได้จาก Backend
    } catch (error) {
      console.error("Error fetching comments:", error);
      setError("Failed to load comments. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (verificationId) {
      fetchComments(); // รีเฟรชคอมเมนต์เมื่อมีการเปลี่ยนแปลง verificationId
    }
  }, [verificationId]);

  // ฟังก์ชันโพสต์คอมเมนต์ใหม่
  const handleSubmit = async () => {
    if (!newComment.trim()) {
      alert("Please enter a comment!");
      return;
    }

    try {
      const payload = {
        member_id: 1, // ไอดีของผู้ใช้งาน (ต้องปรับให้เหมาะสม)
        member_name: loggedInUser, // ชื่อผู้ใช้งาน
        comment_text: newComment, // ข้อความคอมเมนต์
        verification_id: verificationId, // ส่ง verification_id เพื่อเชื่อมโยงกับคอมเมนต์
      };

      const response = await axios.post("http://localhost:3001/comments", payload);
      if (response.status === 201) {
        setNewComment(""); // เคลียร์ข้อความคอมเมนต์
        fetchComments(); // รีเฟรชคอมเมนต์หลังจากเพิ่มคอมเมนต์ใหม่
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Failed to post comment.");
    }
  };

  // ฟังก์ชันลบคอมเมนต์
  const handleDelete = async (commentId) => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      try {
        const response = await axios.delete(`http://localhost:3001/deletecomment/${commentId}`);
        if (response.status === 200) {
          fetchComments(); // รีเฟรชคอมเมนต์หลังจากลบ
        }
      } catch (error) {
        console.error("Error deleting comment:", error);
        alert("Failed to delete comment.");
      }
    }
  };

  // ฟังก์ชันสำหรับการจัดรูปแบบวันที่
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
  };

  // ฟังก์ชันส่งการตอบกลับ
  const handleReplySubmit = async (commentId) => {
    if (!replyComment.trim()) {
      alert("Please enter a reply!");
      return;
    }

    try {
      const payload = {
        member_name: loggedInUser, // ชื่อผู้ใช้งานที่ล็อกอิน
        ver_replies_text: replyComment, // ข้อความตอบกลับ
        verification_id: verificationId, // ID ที่เชื่อมกับการตรวจสอบ
        comment_id: commentId, // ส่ง comment_id ไปด้วย
      };

      const response = await axios.post("http://localhost:3001/replyvercomment", payload);

      if (response.status === 201) {
        setReplyComment(""); // ล้างข้อความในฟอร์มตอบกลับ
        fetchComments(); // รีเฟรชคอมเมนต์เพื่อแสดงการตอบกลับใหม่
      }
    } catch (error) {
      console.error("Error adding reply:", error);
      alert("Failed to post reply.");
    }
  };



  // ฟังก์ชันที่ใช้สำหรับแสดงการตอบกลับ
  const handleReplyClick = (commentId) => {
    setSelectedCommentId(commentId); // เก็บ ID คอมเมนต์ที่เลือกเพื่อแสดงฟอร์มตอบกลับ
  };

  return (
    <div className="comment-section">
      <h2 className="comment-title">Comments ({comments.length})</h2>

      {/* พื้นที่สำหรับโพสต์คอมเมนต์ใหม่ */}
      <div className="comment-input">
        <textarea
          placeholder={`Add comment as ${loggedInUser}...`}
          className="comment-textarea"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <button className="submit-button" onClick={handleSubmit}>
          Add Comment
        </button>
      </div>

      {/* ข้อความแสดงข้อผิดพลาดถ้ามี */}
      {error && <p className="error-message">{error}</p>}

      {/* การแสดงคอมเมนต์ */}
      {loading ? (
        <p>Loading comments...</p>
      ) : (
        comments.map((comment) => (
          <div key={comment.comment_id} className="comment">
            <div className="comment-header">
              <span className="comment-name">{comment.member_name}</span>
              <span className="comment-time">{formatDate(comment.comment_at)}</span>
            </div>
            <p className="comment-text">{comment.comment_text}</p>
            <div className="comment-footer">
              <button className="edit-button">👍</button>
              <button className="reply-button" onClick={() => handleReplyClick(comment.comment_id)}>
                💬 {comment.replies && comment.replies.length}
              </button>
              <button className="delete-comment-button" onClick={() => handleDelete(comment.comment_id)}>
                <img src={trash_comment} alt="trash_comment" className="trash_comment" />
              </button>
            </div>

            {/* แสดงคอมเมนต์ที่ตอบกลับ */}
            {comment.replies && comment.replies.length > 0 && comment.replies.map(reply => (
              <div key={reply.ver_replies_id} className="reply">
                <span className="reply-name">{reply.member_name}</span>
                <span className="reply-time">{formatDate(reply.ver_replies_at)}</span>
                <p className="reply-text">{reply.ver_replies_text}</p>
              </div>


            ))}

            {/* ฟอร์มสำหรับตอบกลับ */}
            {selectedCommentId === comment.comment_id && (
              <div className="reply-input">
                <textarea
                  placeholder="Write a reply..."
                  value={replyComment}
                  onChange={(e) => setReplyComment(e.target.value)}
                />
                <button onClick={() => handleReplySubmit(comment.comment_id)}>Comment Reply</button>
              </div>
            )}

          </div>
        ))
      )}
    </div>
  );
};

export default Comment;
