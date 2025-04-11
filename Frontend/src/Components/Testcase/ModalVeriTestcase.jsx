import React from 'react';
// Import CSS ที่จะมีการแก้ไข Class Name ด้วย
import "./testcase_css/VeriTestcaseModal.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes,
    faUsers,
    faUserCircle,
    faTimesCircle,
    faCheckCircle,
    faListCheck,    // Icon สำหรับ Test Case Section
    faFileAlt       // Icon สำหรับ Test Case Item (ตัวอย่าง)
} from '@fortawesome/free-solid-svg-icons';

const ModalVeriTestcase = ({ show, onClose, details = {}, veritestcaseBy = [] }) => {
    if (!show) return null;

    // --- เปลี่ยนชื่อตัวแปร ---
    const linkedTestcaseIds = details.testcase_id // << เปลี่ยนชื่อตัวแปร
        ? (Array.isArray(details.testcase_id) ? details.testcase_id : [details.testcase_id])
        : [];

    const handleModalContentClick = (e) => {
        e.stopPropagation();
    };

    return (
        <div className="modal-overlay-vt" onClick={onClose}>
            <div className="modal-content-vt" onClick={handleModalContentClick}>

                {/* === Modal Header === */}
                <div className="modal-header-vt">
                    <h2 className="modal-title-vt">Verification Details</h2>
                    <button className="modal-close-btn-vt" onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                {/* === Modal Body === */}
                <div className="modal-body-vt">

                    {/* --- Reviewers Section (เหมือนเดิม) --- */}
                    <div className="modal-section-vt">
                        <h3 className="section-header-vt">
                            <FontAwesomeIcon icon={faUsers} className="section-icon-vt" />
                            Reviewers
                        </h3>
                        <div className="section-content-vt">
                            {Array.isArray(veritestcaseBy) && veritestcaseBy.length > 0 ? (
                                veritestcaseBy.map((reviewer, index) => (
                                    <div className="reviewer-item-vt" key={index}>
                                        <FontAwesomeIcon icon={faUserCircle} className="reviewer-avatar-icon-vt" />
                                        <div className="reviewer-info-vt">
                                            <span className="reviewer-name-vt">{reviewer.name || "Unknown"}</span>
                                            <span className={`reviewer-status-vt ${reviewer.value === true ? 'verified' : 'not-verified'}`}>
                                                {reviewer.value === true ? "Verified" : "Not verified"}
                                            </span>
                                        </div>
                                        <FontAwesomeIcon
                                            icon={reviewer.value === true ? faCheckCircle : faTimesCircle}
                                            className={`reviewer-status-icon-vt ${reviewer.value === true ? 'verified' : 'not-verified'}`}
                                        />
                                    </div>
                                ))
                            ) : (
                                <p className="no-data-vt">No reviewer data available.</p>
                            )}
                        </div>
                    </div>

                    {/* --- Test Cases Section (เปลี่ยนจาก Requirements) --- */}
                    <div className="modal-section-vt">
                        <h3 className="section-header-vt">
                            <FontAwesomeIcon icon={faListCheck} className="section-icon-vt" />
                            {/* --- เปลี่ยนข้อความ --- */}
                            Linked Test Cases
                        </h3>
                        <div className="section-content-vt">
                            {/* --- เปลี่ยนชื่อตัวแปร --- */}
                            {linkedTestcaseIds.length > 0 ? (
                                linkedTestcaseIds.map((id, index) => (
                                    // --- เปลี่ยน Class Name ---
                                    <div className="testcase-item-vt" key={index}> {/* << เปลี่ยน class */}
                                        {/* --- เปลี่ยน Class Name และ Icon (ถ้าต้องการ) --- */}
                                        <FontAwesomeIcon icon={faFileAlt} className="testcase-icon-vt" /> {/* << เปลี่ยน class และ icon */}
                                        {/* --- เปลี่ยน Class Name และ Prefix --- */}
                                        <span className="testcase-id-vt">{`TC-${id.toString().padStart(3, '0')}`}</span> {/* << เปลี่ยน class และ prefix */}
                                    </div>
                                ))
                            ) : (
                                // --- เปลี่ยนข้อความ ---
                                <p className="no-data-vt">No test cases linked.</p>
                            )}
                        </div>
                    </div>

                </div> {/* ปิด modal-body-vt */}
            </div> {/* ปิด modal-content-vt */}
        </div> // ปิด modal-overlay-vt
    );
};

export default ModalVeriTestcase;