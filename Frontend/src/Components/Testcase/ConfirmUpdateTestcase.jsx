import React from 'react';
// สมมติว่าสร้าง CSS แยกสำหรับ Component นี้
import './testcase_css/ConfirmUpdateTestcase.css'; // <<< สร้างไฟล์ CSS นี้
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faTimes } from '@fortawesome/free-solid-svg-icons';

// Props ที่รับเข้ามา:
// - isOpen: boolean ควบคุมการแสดงผล
// - onClose: function ที่จะเรียกเมื่อกดปิด หรือ กดยกเลิก
// - onConfirm: function ที่จะเรียกเมื่อกดยืนยัน
// - title: ข้อความหัวเรื่อง (Optional)
// - message: ข้อความเนื้อหา
// - confirmText: ข้อความปุ่มยืนยัน (Optional, default: "Update")
// - cancelText: ข้อความปุ่มยกเลิก (Optional, default: "Cancel")
const ConfirmUpdateTestcase = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Update", // Default title เหมาะกับการ Update
    message,
    confirmText = "Update",   // Default button text
    cancelText = "Cancel"
}) => {
    if (!isOpen) {
        return null; // ไม่แสดงอะไรเลยถ้า modal ปิดอยู่
    }

    // หยุดการ propagate ของ event คลิก เพื่อไม่ให้คลิกใน modal แล้วไปโดน backdrop ปิด modal
    const handleModalContentClick = (e) => {
        e.stopPropagation();
    };

    return (
        // Backdrop (พื้นหลังมืดๆ) - ใช้ class เดิมหรือเปลี่ยนชื่อก็ได้
        <div className="modal-backdrop-confirm-update" onClick={onClose}>
            {/* Modal Content - ใช้ class เดิมหรือเปลี่ยนชื่อก็ได้ */}
            <div className="modal-content-confirm-update" onClick={handleModalContentClick}>
                {/* ปุ่มปิดมุมขวา (Optional) */}
                <button className="modal-close-btn-confirm-update" onClick={onClose}>
                    <FontAwesomeIcon icon={faTimes} />
                </button>

                {/* ไอคอน (Optional) */}
                <div className="modal-icon-container-confirm-update">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="modal-warning-icon-confirm-update" />
                </div>

                {/* หัวเรื่อง */}
                <h2 className="modal-title-confirm-update">{title}</h2>

                {/* เนื้อหา */}
                {/* ใช้ dangerouslySetInnerHTML ถ้า message มี <br/> หรือ <strong> */}
                <div className="modal-message-confirm-update" dangerouslySetInnerHTML={{ __html: message }}></div>
                {/* หรือถ้า message เป็น string ธรรมดา */}
                {/* <p className="modal-message-confirm-update">{message}</p> */}


                {/* ปุ่ม */}
                <div className="modal-actions-confirm-update">
                    {/* ปุ่ม Cancel */}
                    <button className="modal-cancel-button-confirm-update" onClick={onClose}>
                        {cancelText}
                    </button>
                    {/* ปุ่ม Confirm */}
                    <button className="modal-confirm-button-confirm-update" onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmUpdateTestcase;