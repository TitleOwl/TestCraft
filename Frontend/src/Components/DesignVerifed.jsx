import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import "./CSS/DesignVerifed.css";
import trash_comment from "../image/trash_comment.png";

const DesignVerifed = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const veridesignId = queryParams.get("veridesign_id");
    const { selectedDesign = [] } = location.state || {};
    const [designcriList, setDesigncriList] = useState([]);
    const [designDetails, setDesignDetails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [checkboxState, setCheckboxState] = useState({});
    const [veridesignBy, setVeridesignBy] = useState({});
    const storedUsername = localStorage.getItem("username");
    const designId = queryParams.get("design_id");
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!projectId || !veridesignId) {
            console.error("Project ID or Design ID is missing.");
            navigate("/VeriDesign");
            return;
        }

        fetchCriteria();
        fetchDesignDetails(selectedDesign);
        fetchVeridesignBy();
    }, [projectId, veridesignId, selectedDesign, navigate]);

    useEffect(() => {
        fetchComments();
    }, [veridesignId]);

    const fetchVeridesignBy = async () => {
        try {
            const response = await axios.get("http://localhost:3001/designveri", {
                params: { project_id: projectId, veridesign_id: veridesignId, design_id: designId },
            });
            const veridesign = response.data.find(
                (item) => item.id === veridesignId
            );
            setVeridesignBy(veridesign?.veridesign_by || {});
        } catch (error) {
            console.error("Error fetching veridesign_by:", error);
        }
    };

    const fetchCriteria = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:3001/designcriteria/${projectId}`);
            const initialCheckboxState = response.data.reduce((acc, criteria) => {
                acc[criteria.design_cri_id] = false;
                return acc;
            }, {});
            setDesigncriList(response.data);

            const storedUsername = localStorage.getItem("username");
            if (storedUsername) {
                const storedCheckboxState = localStorage.getItem(
                    `checkboxState_${storedUsername}_${projectId}_${veridesignId}`
                );
                setCheckboxState(
                    storedCheckboxState ? JSON.parse(storedCheckboxState) : initialCheckboxState
                );
            }
        } catch (error) {
            console.error("Error fetching design criteria:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDesignDetails = async () => {
        try {
            const response = await axios.get("http://localhost:3001/verifydesign", {
                params: { design_id: designId },
            });
            setDesignDetails(response.data);
        } catch (error) {
            console.error("Error fetching design details:", error);
        }
    };

    const fetchComments = async () => {
        try {
            const response = await axios.get("http://localhost:3001/get-commentveridesign", {
                params: { veridesign_id: veridesignId },
            });
            setComments(response.data); // set comments เป็น response.data เสมอ
        } catch (error) {
            console.error("Error fetching comments:", error);
        }
    };

    const handleCheckboxChange = (id) => {
        setCheckboxState((prevState) => {
            const updatedState = { ...prevState, [id]: !prevState[id] };

            localStorage.setItem(
                `checkboxState_${storedUsername}_${projectId}_${veridesignId}`,
                JSON.stringify(updatedState)
            );

            return updatedState;
        });
    };

    const handleSave = async () => {
        console.log("design_id", designId);

        if (!storedUsername) {
            Swal.fire({
                icon: "warning",
                title: "ข้อมูล reviewer ขาดหาย",
                text: "กรุณารีเฟรชหน้า",
            });
            return;
        }

        const allChecked = designcriList.every((criteria) => checkboxState[criteria.design_cri_id]);

        if (!allChecked) {
            Swal.fire({
                icon: "warning",
                title: "Criteria Checklist Saved",
                timer: 1500,
                showConfirmButton: false,
            }).then(() => {
                navigate(`/VeriDesign?project_id=${projectId}`);
            });
            return;
        }

        const updatedVeridesignBy = { ...veridesignBy, [storedUsername]: true };

        try {
            const response = await axios.put("http://localhost:3001/update-veridesign-by", {
                veridesign_id: veridesignId,
                veridesign_by: updatedVeridesignBy,
            });

            if (response.data.message === "ไม่พบข้อมูล veridesign นี้ในฐานข้อมูล") {
                Swal.fire({
                    icon: "error",
                    title: "ไม่พบข้อมูล veridesign ID",
                    text: "กรุณาตรวจสอบใหม่",
                });
                return;
            }

            const updatedResponse = await axios.get("http://localhost:3001/designveri", {
                params: { project_id: projectId, veridesign_id: veridesignId },
            });

            const data = updatedResponse.data[0];

            const allReviewed = data.veridesign_by &&
                Object.values(data.veridesign_by).every((status) => status === true);

            if (allReviewed) {
                const designIdsArray = designId.split(",").map((id) => id.trim());

                if (designIdsArray.length === 0) {
                    Swal.fire({
                        icon: "error",
                        title: "ไม่พบข้อมูล design ID",
                        text: "กรุณาตรวจสอบใหม่",
                    });
                    return;
                }

                const updateStatusResponse = await axios.put(
                    `http://localhost:3001/update-design-status-verified`,
                    { design_ids: designIdsArray, design_status: "VERIFIED" }
                );

                if (updateStatusResponse.data.message === "Design status updated to VERIFIED successfully.") {
                    Swal.fire({
                        icon: "success",
                        title: "อัปเดตสถานะเป็น VERIFIED สำเร็จ",
                        timer: 1500,
                        showConfirmButton: false,
                    }).then(() => {
                        navigate(`/Dashboard?project_id=${projectId}`, {
                            state: { selectedSection: "Design" },
                        })
                    });
                } else {
                    Swal.fire({
                        icon: "error",
                        title: "ไม่สามารถอัปเดตสถานะได้",
                        text: "กรุณาลองใหม่",
                        timer: 2000,
                        showConfirmButton: false,
                    });
                }
            } else {
                Swal.fire({
                    icon: "warning",
                    title: "ยังมี reviewer ที่ยังไม่ได้ทำการตรวจสอบ",
                });
            }
        } catch (error) {
            console.error("Error updating verification status:", error);
            Swal.fire({
                icon: "error",
                title: "ไม่สามารถอัปเดตสถานะได้",
                text: "กรุณาลองใหม่",
            });
        }
    };

    const handleSubmit = async () => {
        if (!newComment.trim()) {
            setError("กรุณาใส่ข้อความก่อนโพสต์");
            return;
        }

        try {
            const response = await axios.post("http://localhost:3001/commentveridesign", {
                member_name: storedUsername,
                comverdesign_text: newComment,
                veridesign_id: veridesignId
            });

            if (response.status === 201) {
                setNewComment("");
                fetchComments();
                toast.success("The comment has been successfully added.", {
                    autoClose: 2000,
                });
            }
        } catch (error) {
            console.error("Error posting comment:", error);
            toast.error("เกิดข้อผิดพลาดในการโพสต์คอมเมนต์");
        }
    };

    const handleDelete = async (comverdesign_id) => {
        if (!window.confirm("Are you sure you want to delete this comment?")) {
            return;
        }

        try {
            const response = await axios.delete(`http://localhost:3001/delete-commentveridesign/${comverdesign_id}`);

            if (response.status !== 200) {
                throw new Error(response.data.error || "Failed to delete comment");
            }

            toast.success("Comment deleted successfully", {
                autoClose: 2000,
            });

            setComments((prevComments) =>
                prevComments.filter((comment) => comment.comverdesign_id !== comverdesign_id)
            );
        } catch (error) {
            console.error("Error deleting comment:", error);
            toast.error("Error deleting comment: " + error.message);
        }
    };

    return (
        <div className="designveri-container">
            <h1 className="title-designver">Verification Design</h1>
            <div className="design-verified-container">
                <div className="checklistveri-design-box">
                    <h2 className="checklistveri-design-title">Software Design Verification Checklist</h2>
                    {loading ? (
                        <p className="checklistveri-design-loading">Loading...</p>
                    ) : (
                        <ul className="checklistveri-design-list">
                            {designcriList.map((criteria) => (
                                <li key={criteria.design_cri_id} className="checklistveri-design-item">
                                    <label className="checklistveri-design-label">
                                        <input
                                            type="checkbox"
                                            className="checklistveri-design-checkbox"
                                            checked={checkboxState[criteria.design_cri_id] || false}
                                            onChange={() => handleCheckboxChange(criteria.design_cri_id)}
                                        />
                                        {criteria.design_cri_name}
                                    </label>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="commentveridesign-box">
                    <div className="commentveridesign-section">
                        <h2 className="commentveridesign-title">Comments ({comments.length})</h2>

                        <div className="commentveridesign-input-container">
                            <textarea
                                placeholder={`Add comment as ${storedUsername}...`}
                                className="commentveridesign-textarea"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                            />
                            <button className="commentveridesign-submit-button" onClick={handleSubmit}>
                                Submit
                            </button>
                        </div>

                        {error && <p className="commentveridesign-error-message">{error}</p>}

                        {comments.length === 0 ? (
                            <p className="commentveridesign-no-comments">No comments available at the moment.</p>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.comverdesign_id} className="commentveridesign-item">
                                    <div className="commentveridesign-header">
                                        <span className="commentveridesign-name">{comment.member_name}</span>
                                        <span className="commentveridesign-time">{new Date(comment.comverdesign_at).toLocaleString()}</span>
                                    </div>
                                    <p className="commentveridesign-text">{comment.comverdesign_text}</p>
                                    <div className="commentveridesign-footer">
                                        <button
                                            className="commentveridesign-delete-button"
                                            onClick={() => handleDelete(comment.comverdesign_id)}
                                        >
                                            <img src={trash_comment} alt="Delete" className="commentveridesign-trash" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="boxrequirement-designveri">
                <h1 className="title-softwaredesign">Software Design</h1>
                <table className="table-req-designveri">
                    <thead>
                        <tr><th>ID</th><th>Design Name</th><th>Type</th></tr>
                    </thead>
                    <tbody>
                        {designDetails.length > 0 ? (
                            designDetails.map((design) => (
                                <tr key={design.design_id}>
                                    <td>SD-0{design.design_id}</td>
                                    <td>{design.diagram_name || "N/A"}</td>
                                    <td>{design.design_type || "N/A"}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3">No design details found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="button-container">
                <button onClick={handleSave} className="savedesignveri-button">Save</button>
            </div>
        </div>
    );
};

export default DesignVerifed;