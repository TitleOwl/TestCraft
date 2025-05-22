// Components/DeletionLogSection.js
import React from 'react';

const DeletionLogSection = ({ deletionLogs, loading, selectedLogTableName, setSelectedLogTableName }) => {
    // Array of table names to display in the dropdown
    const tableOptions = [
        // เปลี่ยน 'requirement_criteria' เป็น 'requirementcriteria'
        { value: 'requirementcriteria', label: 'Requirement Criteria' },
        // ตรวจสอบชื่อตารางอื่นๆ ในฐานข้อมูลของคุณด้วยว่ามี underscore หรือไม่
        // ถ้า design_criteria ใน DB เป็น designcriteria ให้เปลี่ยนเช่นกัน
        { value: 'designcriteria', label: 'Design Criteria' }, // ตัวอย่าง: ถ้าใน DB คือ 'designcriteria'
        { value: 'testcasecriteria', label: 'Testcase Criteria' }, // ตัวอย่าง: ถ้าใน DB คือ 'testcasecriteria'
        { value: 'traceabilitycriteria', label: 'Traceability Criteria' }, // ตัวอย่าง: ถ้าใน DB คือ 'traceabilitycriteria'
        // Add more if you log deletions from other tables
    ];

    return (
        <div className="criteria-section">
            <div className="criteria-header">
                <h2>Deletion History</h2>
                <div className="divider"></div>
            </div>

            <div className="deletion-log-controls" style={{ marginBottom: '20px' }}>
                <label htmlFor="selectTableName">View logs for: </label>
                <select
                    id="selectTableName"
                    value={selectedLogTableName}
                    onChange={(e) => setSelectedLogTableName(e.target.value)}
                    className="criteria-input"
                    style={{ width: 'auto', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                    {tableOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading deletion logs...</p>
                </div>
            ) : (
                <div className="deletion-log-list" style={{ maxHeight: '500px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '5px' }}>
                    {deletionLogs && deletionLogs.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f0f0f0' }}>
                                    <th style={tableHeaderStyle}>ID</th>
                                    <th style={tableHeaderStyle}>Work Product</th>
                                    <th style={tableHeaderStyle}>Criteria Name</th>
                                    <th style={tableHeaderStyle}>Deleted By</th>
                                    <th style={tableHeaderStyle}>Deleted At</th>

                                </tr>
                            </thead>
                            <tbody>
                                {deletionLogs.map((log) => (
                                    <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={tableCellStyle}>{log.id}</td>
                                        <td style={tableCellStyle}>{log.table_name}</td>
                                        <td style={tableCellStyle}>
                                            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.8em', margin: 0, padding: 0 }}>
                                                {log.old_data ? JSON.stringify(JSON.parse(log.old_data), null, 2) : 'N/A'}
                                            </pre>
                                        </td>
                                        <td style={tableCellStyle}>{log.deleted_by}</td>
                                        <td style={tableCellStyle}>{new Date(log.deleted_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No deletion logs found for the selected table.</p>
                    )}
                </div>
            )}
        </div>
    );
};

const tableHeaderStyle = {
    padding: '10px',
    textAlign: 'left',
    borderBottom: '2px solid #ddd',
    fontWeight: 'bold',
    backgroundColor: '#e6e6e6'
};

const tableCellStyle = {
    padding: '10px',
    textAlign: 'left',
    borderBottom: '1px solid',
    verticalAlign: 'top'
};

export default DeletionLogSection;