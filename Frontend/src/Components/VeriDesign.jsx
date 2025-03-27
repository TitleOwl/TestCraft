import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import axios from "axios";
import notverify from "../image/notverify.png";
import verifydone from "../image/verifydone.png";
import "./CSS/VeriDesign.css";
import "./CSS/buttons/buttons.css";

const Modal = ({ show, onClose, details = {}, veridesignBy = [] }) => {
  if (!show) return null;

  // Ensure that design_ids is always an array
  const designIds = Array.isArray(details.design_ids) ? details.design_ids : [details.design_ids];

  return (
    <div className="modal-overlay-review">
      <div className="modal-content-review">
        <h3>Design Details</h3>
        <div>
          <p><strong>Design ID:</strong> {designIds.join(", ") || "N/A"}</p>
          <p><strong>Created By:</strong> {details.created_by}</p>
        </div>

        <h3>Verification Status</h3>
        {veridesignBy.length > 0 ? (
          veridesignBy.map((reviewer, index) => (
            <div className="list-reviewer" key={index}>
              <span>{reviewer.name}</span>
              <img
                src={reviewer.value ? verifydone : notverify}
                alt={reviewer.value ? "Verified" : "Not Verified"}
                className="verification-status-icon"
              />
            </div>
          ))
        ) : (
          <div>No verification by users found.</div>
        )}

        <button className="close-modal-review-button" onClick={onClose}>✖ Close</button>
      </div>
    </div>
  );
};

const VeriDesign = () => {
  const [designs, setDesigns] = useState([]);
  const [selectedDesign, setSelectedDesign] = useState({});
  const [assignedReviewers, setAssignedReviewers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");

  const fetchDesigns = useCallback(() => {
    axios
      .get(`http://localhost:3001/verilistdesign?project_id=${projectId}`)
      .then((response) => {
        console.log("Fetched Designs:", response.data);

        // Group designs ตาม veridesign_round
        const groupedDesigns = response.data.reduce((acc, design) => {
          const round = design.veridesign_round;
          // ถ้ายังไม่มี key นี้ใน accumulator ให้สร้าง object ใหม่
          if (!acc[round]) {
            acc[round] = {
              ...design,
              // เก็บ design_ids ในรูปแบบ Array
              design_ids: Array.isArray(design.design_ids)
                ? design.design_ids
                : [design.design_ids],
              // แปลง veridesign_by ให้เป็น Array ถ้าเป็น Object
              veridesign_by:
                typeof design.veridesign_by === "object"
                  ? Object.entries(design.veridesign_by).map(([name, value]) => ({
                    name,
                    value: value === true, // ตรวจสอบให้แน่ใจว่าค่าเป็น Boolean
                  }))
                  : design.veridesign_by,
            };
          } else {
            // ถ้ามี key นี้อยู่แล้ว ให้นำ design_ids ใหม่ไปต่อท้าย array เดิม
            acc[round].design_ids.push(design.design_ids);
            // รวม veridesign_by โดยการ merge แล้ว deduplicate (กรณี reviewer ซ้ำกัน)
            if (typeof design.veridesign_by === "object") {
              const newVeri = Object.entries(design.veridesign_by).map(
                ([name, value]) => ({ name, value: value === true })
              );
              const combined = [...acc[round].veridesign_by, ...newVeri];
              // ดำเนินการ deduplicate โดยใช้ชื่อ reviewer เป็น key
              const deduped = [];
              const reviewerNames = new Set();
              combined.forEach((item) => {
                if (!reviewerNames.has(item.name)) {
                  reviewerNames.add(item.name);
                  deduped.push(item);
                }
              });
              acc[round].veridesign_by = deduped;
            }
          }
          return acc;
        }, {});

        // เปลี่ยน object กลุ่มให้เป็น array
        const processedDesigns = Object.values(groupedDesigns)
          // ตัวอย่างกรองเฉพาะสถานะที่ "WAITING FOR VERIFICATION"
          .filter((design) => design.design_status === "WAITING FOR VERIFICATION");

        console.log("Processed Designs:", processedDesigns);
        setDesigns(processedDesigns);
      })
      .catch((err) => {
        console.error("Error fetching designs:", err);
        toast.error("Error fetching designs.", { autoClose: 3000 });
      });
  }, [projectId]);


  useEffect(() => {
    fetchDesigns();
  }, [fetchDesigns]);

  const handleSearchClick = (design, veridesignBy) => {
    setSelectedDesign(design || {});
    setAssignedReviewers(veridesignBy || []); // ตั้งค่า assignedReviewers เป็นข้อมูลที่แปลงแล้ว
    setShowModal(true);
  };

  const handleVerifyClick = (design) => {
    const loggedInUsername = localStorage.getItem("username");

    if (!loggedInUsername) {
      Swal.fire({
        icon: "error",
        title: "กรุณาเข้าสู่ระบบ",
        text: "กรุณาเข้าสู่ระบบก่อนทำการตรวจสอบ",
        confirmButtonText: "ตกลง",
      });
      return;
    }

    const isAssignedReviewer = design.veridesign_by.some(
      (reviewer) => reviewer.name === loggedInUsername
    );

    if (!isAssignedReviewer) {
      Swal.fire({
        icon: "error",
        title: "ไม่มีสิทธิ์",
        text: "คุณไม่มีสิทธิ์ในการตรวจสอบดีไซน์นี้",
        confirmButtonText: "ตกลง",
      });
      return;
    }

    if (!projectId || !design?.design_ids || !design?.veridesign_id) {
      Swal.fire({
        icon: "error",
        title: "ข้อมูลไม่ถูกต้อง",
        text: "Invalid project ID or no design selected.",
        confirmButtonText: "ตกลง",
      });
      return;
    }

    const designIds = Array.isArray(design.design_ids) ? design.design_ids : [design.design_ids];
    const designId = designIds.join(",");

    if (!designId) {
      Swal.fire({
        icon: "error",
        title: "ไม่พบ Design ID",
        text: "Design ID ไม่พบ กรุณาตรวจสอบใหม่",
        confirmButtonText: "ตกลง",
      });
      return;
    }

    const veridesignId = design.veridesign_id;
    navigate(`/DesignVerifed?project_id=${projectId}&design_id=${designId}&veridesign_id=${veridesignId}`, {
      state: { selectedDesign: designIds },
    });
  };
  
  return (
    <div className="design-list-container">
      <h1 className="design-list">Design List</h1>
      {designs.length === 0 ? (
        <p>No designs available.</p>
      ) : (
        <table className="design-table">
          <thead>
            <tr>
              <th>Round</th>
              <th>Created By</th>
              <th>Date</th>
              <th>Status</th>
              <th>Reviewers</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {designs.map((design) => (
              <tr key={design.veridesign_round}>
                <td>{design.veridesign_round}</td>
                <td>{design.create_by}</td>
                <td>{new Date(design.veridesign_at).toLocaleDateString()}</td>
                <td>{design.design_status || ""}</td>
                <td>
                  <button
                    className="search-icon-button"
                    title="View Reviewers"
                    onClick={() =>
                      handleSearchClick(
                        {
                          design_ids: design.design_ids,
                          design_status: design.design_status,
                          created_by: design.create_by,
                        },
                        design.veridesign_by // ส่งข้อมูลที่ถูกแปลงแล้ว
                      )
                    }
                  >
                    🔍
                  </button>
                </td>
                <td>
                  <button className='Verify-button' onClick={() => handleVerifyClick(design)}>Verify</button>
                </td>
              </tr>
            ))}
          </tbody>


        </table>
      )}

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        details={selectedDesign}
        veridesignBy={assignedReviewers}
      />
    </div>
  );
};


export default VeriDesign;
