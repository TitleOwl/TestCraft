import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from "react-toastify";
import { format } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import "./CSS/commentTraceability.css";

const CommentVerTrace = ({ projectId, round }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [isLoadingComments, setIsLoadingComments] = useState(true);
    const [commentError, setCommentError] = useState(null);

    const getCurrentUsername = () => localStorage.getItem("username");

    const fetchComments = async () => {
        if (!projectId || !round) {
            setComments([]); setIsLoadingComments(false); return;
        }
        setIsLoadingComments(true); setCommentError(null);
        try {
            const response = await axios.get(`http://localhost:3001/verificationComments`, { params: { project_id: projectId, create_round: round } });
            if (response.data?.success && Array.isArray(response.data.data)) { setComments(response.data.data); }
            else { setComments([]); console.warn("No comments found or invalid format:", response.data?.message); }
        } catch (err) {
            console.error(`Error fetching comments for round ${round}:`, err); setCommentError("Failed to load comments.");
        } finally { setIsLoadingComments(false); }
    };

    useEffect(() => {
        fetchComments();
    }, [projectId, round]);

    const handleCommentChange = (event) => { setNewComment(event.target.value); };

    const handleCommentSubmit = async () => {
        const currentUsername = getCurrentUsername();
        if (!newComment.trim()) { toast.warn("Comment cannot be empty."); return; }
        if (!currentUsername) { toast.error("Cannot submit comment. User not found."); return; }
        if (!projectId || !round) { toast.error("Cannot submit comment. Project ID or Round missing."); return; }

        const payload = { project_id: projectId, create_round: round, comment_text: newComment, comment_by: currentUsername };

        try {
            const response = await axios.post("http://localhost:3001/verificationComments", payload);
            if (response.data?.success) {
                toast.success("Comment added successfully!"); setNewComment(""); fetchComments();
            } else { toast.error(`Failed to add comment: ${response.data?.message || 'Unknown error'}`); }
        } catch (error) {
            console.error("Error submitting comment:", error);
            toast.error(`Error submitting comment: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleDeleteComment = async (commentIdToDelete, commentBy) => {
        const currentUsername = getCurrentUsername();

        if (currentUsername !== commentBy) {
            toast.error("You can only delete your own comments.");
            return;
        }

        if (!window.confirm("Are you sure you want to delete this comment?")) {
            return;
        }

        try {
            const response = await axios.delete(`http://localhost:3001/verificationComments/${commentIdToDelete}`, {
                data: { username: currentUsername }
            });

            if (response.data?.success) {
                toast.success("Comment deleted successfully!");
                fetchComments(); // รีเฟรชคอมเมนต์
            } else {
                toast.error(`Failed to delete comment: ${response.data?.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Error deleting comment:", error);
            toast.error(`Error deleting comment: ${error.response?.data?.message || error.message}`);
        }
    };



    // --- JSX ที่แก้ไข Class Name ---
    return (
        // ใช้ comment-traceability-section เป็น Class นอกสุด
        <div className="comment-traceability-section" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
            <div className="comment-traceability-list-container" style={{ marginBottom: '15px', maxHeight: '250px', overflowY: 'auto', border: '1px solid #ccc', padding: '15px', borderRadius: '4px', background: '#f9f9f9' }}>
                {/* ใช้ comment-traceability-loading */}
                {isLoadingComments && <p className="comment-traceability-loading">Loading comments...</p>}
                {/* ใช้ comment-traceability-error */}
                {commentError && <p className="comment-traceability-error">{commentError}</p>}
                {!isLoadingComments && !commentError && comments.length === 0 && (
                    /* ใช้ comment-traceability-no-data */
                    <p className="comment-traceability-no-data" style={{ fontStyle: 'italic', color: '#777' }}>No comments yet for this round.</p>
                )}
                {!isLoadingComments && !commentError && comments.length > 0 && (
                    // ใช้ comment-traceability-list
                    <ul className="comment-traceability-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {comments.map((comment) => (
                            // ใช้ comment-traceability-item
                            <li key={comment.comment_id} className="comment-traceability-item" style={{ marginBottom: '15px', borderBottom: '1px dotted #ddd', paddingBottom: '10px' }}>
                                {/* ใช้ comment-traceability-text */}
                                <p className="comment-traceability-text" style={{ margin: '0 0 5px 0', whiteSpace: 'pre-wrap' }}>{comment.comment_text}</p>
                                {/* ใช้ comment-traceability-meta */}
                                <span className="comment-traceability-meta" style={{ fontSize: '0.85em', color: '#555' }}>
                                    By: <strong className="comment-traceability-author" style={{ color: '#333' }}>{comment.comment_by}</strong> at {comment.comment_at ? format(new Date(comment.comment_at), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}
                                    <button
                                        onClick={() => handleDeleteComment(comment.comment_id, comment.comment_by)}
                                        title="Delete Comment"
                                        className="comment-traceability-delete-btn"
                                        style={{ marginLeft: '10px', color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px', fontSize: '1.2em' }}
                                    >
                                        <FontAwesomeIcon icon={faTrashAlt} size="xs" />
                                    </button>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* ส่วนเพิ่ม Comment ใหม่ */}
            {/* ใช้ comment-traceability-form */}
            <div className="comment-traceability-form">
                {/* ใช้ comment-traceability-textarea */}
                <textarea
                    className="comment-traceability-textarea"
                    rows="3"
                    placeholder="Add your comment here..."
                    value={newComment}
                    onChange={handleCommentChange}
                    style={{ width: '100%', marginBottom: '10px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', resize: 'vertical' }}
                />
                {/* ใช้ comment-traceability-button */}
                <button className="comment-traceability-button" onClick={handleCommentSubmit} disabled={!newComment.trim() || isLoadingComments}>
                    Add Comment
                </button>
            </div>
        </div>
    );
};

export default CommentVerTrace;