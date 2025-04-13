// ModalVeriTestcase.js

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes,
    faUsers,
    faUser,
    faClipboardList,
    faClipboardCheck,
    faCheckCircle
    // Add faClock or faHourglass if you want a different icon for "Not Verified" status
} from '@fortawesome/free-solid-svg-icons';

// Import the new CSS file for the modal
import './testcase_css/VeriTestcaseModal.css'; // <<< Make sure this path is correct

// Helper function (optional, can be passed as prop or defined elsewhere)
const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-GB', options);
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return "Invalid Date";
    }
};


const ModalVeriTestcase = ({ show, onClose, details = {}, veritestcaseBy = [] }) => {
    if (!show) return null;

    // Destructure details for easier access
    const { verif_round, created_by, assigned_date, linked_testcases = [] } = details;

    return (
        // Use class names from VeriTestcaseModal.css
        <div className="modal-overlay-vt">
            <div className="modal-content-vt">
                <div className="modal-header-vt">
                    <h3 className="modal-title-vt"> {/* Apply title class */}
                        Verification Details (VERIF-{verif_round || 'N/A'})
                    </h3>
                    <button className="modal-close-btn-vt" onClick={onClose}> {/* Apply close button class */}
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                <div className="modal-body-vt"> {/* Apply body class */}

                    {/* Reviewers Section */}
                    <div className="modal-section-vt"> {/* Apply section wrapper */}
                        <h4 className="section-header-vt"> {/* Apply section header class */}
                            <FontAwesomeIcon icon={faUsers} className="section-icon-vt" /> {/* Apply icon class */}
                            Reviewers
                        </h4>
                        <div className="section-content-vt"> {/* Apply section content wrapper */}
                            {veritestcaseBy.length > 0 ? (
                                veritestcaseBy.map((reviewer, index) => (
                                    // Apply reviewer item class
                                    <div className="reviewer-item-vt" key={index}>
                                        {/* Apply avatar icon class */}
                                        <FontAwesomeIcon icon={faUser} className="reviewer-avatar-icon-vt" />
                                        {/* Apply reviewer info wrapper class */}
                                        <div className="reviewer-info-vt">
                                             {/* Apply name class */}
                                            <span className="reviewer-name-vt">{reviewer.name}</span>
                                             {/* Apply status class + conditional verified/not-verified */}
                                            <span className={`reviewer-status-vt ${reviewer.value ? 'verified' : 'not-verified'}`}>
                                                {reviewer.value ? 'Verified' : 'Not verified'}
                                            </span>
                                        </div>
                                        {/* Apply status icon class + conditional verified/not-verified */}
                                        <FontAwesomeIcon
                                            icon={reviewer.value ? faCheckCircle : faTimes} // Use faTimes or another icon for not verified
                                            className={`reviewer-status-icon-vt ${reviewer.value ? 'verified' : 'not-verified'}`}
                                        />
                                    </div>
                                ))
                            ) : (
                                 // Apply no data class
                                <div className="no-data-vt">No reviewers assigned or status unavailable.</div>
                            )}
                        </div>
                    </div>

                    {/* Linked Test Cases Section */}
                    <div className="modal-section-vt"> {/* Apply section wrapper */}
                        <h4 className="section-header-vt"> {/* Apply section header class */}
                            <FontAwesomeIcon icon={faClipboardList} className="section-icon-vt" /> {/* Apply icon class */}
                            Linked Test Cases
                        </h4>
                        <div className="section-content-vt"> {/* Apply section content wrapper */}
                            {linked_testcases.length > 0 ? (
                                // Using div instead of ul to match reviewer structure, but ul is also fine
                                // Apply test case item class
                                linked_testcases.map((testcaseId, index) => (
                                    <div key={index} className="testcase-item-vt">
                                        {/* Apply test case icon class */}
                                        <FontAwesomeIcon icon={faClipboardCheck} className="testcase-icon-vt" />
                                        {/* Apply test case id class */}
                                        <span className="testcase-id-vt">
                                            TC-{String(testcaseId).padStart(3, '0')}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                 // Apply no data class
                                <div className="no-data-vt">No test cases linked to this verification round.</div>
                            )}
                        </div>
                    </div>

                    {/* Optional: Other Details Section */}
                     {/*
                     <div className="modal-section-vt">
                         <h4 className="section-header-vt">
                             <FontAwesomeIcon icon={faInfoCircle} className="section-icon-vt" />
                             Other Info
                         </h4>
                         <div className="section-content-vt other-info-content-vt"> // Optional specific class
                             <p><strong>Created By:</strong> {created_by || 'N/A'}</p>
                             <p><strong>Date Assigned:</strong> {assigned_date ? formatDate(assigned_date) : 'N/A'}</p>
                         </div>
                     </div>
                     */}

                </div>
            </div>
        </div>
    );
};

export default ModalVeriTestcase;
