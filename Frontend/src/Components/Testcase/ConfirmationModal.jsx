// src/components/ConfirmationModal.js (หรือตำแหน่งที่คุณต้องการ)
import React from 'react';
import './testcase_css/ConfirmationModal.css'; // สร้างไฟล์ CSS สำหรับตกแต่ง
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faTimes } from '@fortawesome/free-solid-svg-icons';

// Props ที่รับเข้ามา:
// - isOpen: boolean ควบคุมการแสดงผล
// - onClose: function ที่จะเรียกเมื่อกดปิด หรือ กดยกเลิก
// - onConfirm: function ที่จะเรียกเมื่อกดยืนยัน
// - title: ข้อความหัวเรื่อง (Optional)
// - message: ข้อความเนื้อหา
// - confirmText: ข้อความปุ่มยืนยัน (Optional, default: "ยืนยัน")
// - cancelText: ข้อความปุ่มยกเลิก (Optional, default: "ยกเลิก")
const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = "ยืนยันการกระทำ",
    message,
    confirmText = "ยืนยัน",
    cancelText = "ยกเลิก"
}) => {
    if (!isOpen) {
        return null; // ไม่แสดงอะไรเลยถ้า modal ปิดอยู่
    }

    // หยุดการ propagate ของ event คลิก เพื่อไม่ให้คลิกใน modal แล้วไปโดน backdrop ปิด modal
    const handleModalContentClick = (e) => {
        e.stopPropagation();
    };

    return (
        // Backdrop (พื้นหลังมืดๆ)
        <div className="modal-backdrop" onClick={onClose}>
            {/* Modal Content */}
            <div className="modal-content" onClick={handleModalContentClick}>
                {/* ปุ่มปิดมุมขวา (Optional) */}
                <button className="modal-close-btn" onClick={onClose}>
                    <FontAwesomeIcon icon={faTimes} />
                </button>

                {/* ไอคอน (Optional) */}
                <div className="modal-icon-container">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="modal-warning-icon" />
                </div>

                {/* หัวเรื่อง */}
                <h2 className="modal-title">{title}</h2>

                {/* เนื้อหา */}
                <p className="modal-message">{message}</p>

                {/* ปุ่ม */}
                <div className="modal-actions">
                    <button className="modal-cancel-button" onClick={onClose}>
                        {cancelText}
                    </button>
                    <button className="modal-confirm-button" onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;