import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import "./CSS/CreateRequirement.css";
import { toast } from 'react-toastify';
import Swal from "sweetalert2";
import 'react-toastify/dist/ReactToastify.css';

const UpdateRequirement = () => {
    // States สำหรับเก็บค่าปัจจุบันของฟอร์ม
    const [requirementStatement, setRequirementStatement] = useState("");
    const [requirementType, setRequirementType] = useState("");
    const [description, setDescription] = useState("");
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [selectedFileIds, setSelectedFileIds] = useState([]); // IDs ของไฟล์ที่เกี่ยวข้อง (ตอนนี้จะไม่ถูกบังคับว่าต้องมีอย่างน้อย 1 ไฟล์)
    const [requirementStatus, setRequirementStatus] = useState(""); // สถานะปัจจุบันของ Requirement

    // States สำหรับเก็บค่าเริ่มต้นเมื่อโหลดข้อมูลมา เพื่อใช้เปรียบเทียบการเปลี่ยนแปลง
    const [initialRequirementStatement, setInitialRequirementStatement] = useState("");
    const [initialRequirementType, setInitialRequirementType] = useState("");
    const [initialDescription, setInitialDescription] = useState("");
    const [initialSelectedFileIds, setInitialSelectedFileIds] = useState([]);
    const [initialRequirementStatus, setInitialRequirementStatus] = useState(""); // State สำหรับสถานะเดิม

    // States สำหรับ UI/การจัดการ Error
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Router Hooks
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(window.location.search);
    const projectId = queryParams.get("project_id");
    const requirementId = queryParams.get("requirement_id");

    // Fetch data เมื่อ Component โหลดหรือ projectId/requirementId เปลี่ยน
    useEffect(() => {
        if (projectId) {
            // โหลดรายการไฟล์ที่อัปโหลดแล้ว
            fetchData(fetchUploadedFiles);
        }
        if (requirementId) {
            // โหลดข้อมูล Requirement ที่ต้องการแก้ไข
            fetchData(fetchRequirementData);
        }
    }, [projectId, requirementId]); // Dependencies array บอกให้ useEffect ทำงานใหม่เมื่อค่าเหล่านี้เปลี่ยน

    // Generic data fetching wrapper
    const fetchData = async (callback) => {
        setIsLoading(true);
        try {
            await callback();
        } catch (err) {
            console.error("Error in fetchData wrapper:", err);
            // callback ควรจัดการ error และ throw ถ้าจำเป็น เพื่อให้ error ถูกส่งต่อ
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch รายการไฟล์ที่ Uploaded แล้วสำหรับ Project นี้
    const fetchUploadedFiles = async () => {
        try {
            const res = await axios.get(`http://localhost:3001/files?project_id=${projectId}`);
            setUploadedFiles(res.data);
        } catch (err) {
            console.error("Error fetching uploaded files:", err);
            setError(`Failed to load uploaded files: ${err.response?.data?.message || err.message}`);
            throw err; // Re-throw to be caught by fetchData wrapper
        }
    };

    // Fetch ข้อมูล Requirement เฉพาะที่จะแก้ไข
    const fetchRequirementData = async () => {
        try {
            const res = await axios.get(`http://localhost:3001/requirement/${requirementId}`);
            const { requirement_name, requirement_type, requirement_description, filereq_ids, requirement_status } = res.data;

            // ตั้งค่า States ปัจจุบัน
            setRequirementStatement(requirement_name);
            setRequirementType(requirement_type);
            setDescription(requirement_description);
            // filereq_ids อาจเป็น null หรือ undefined ถ้าไม่มีไฟล์
            setSelectedFileIds(filereq_ids || []);
            setRequirementStatus(requirement_status);

            // กำหนดค่าเริ่มต้นเพื่อใช้เปรียบเทียบการเปลี่ยนแปลงในภายหลัง
            setInitialRequirementStatement(requirement_name);
            setInitialRequirementType(requirement_type);
            setInitialDescription(requirement_description);
            setInitialSelectedFileIds(filereq_ids || []);
            setInitialRequirementStatus(requirement_status); // เก็บสถานะเดิมไว้ที่นี่

        } catch (error) {
            console.error("Error fetching requirement data:", error.response?.data || error.message);
            setError(`Failed to fetch requirement data: ${error.response?.data?.message || error.message}`); // แสดง error ให้ผู้ใช้เห็น
            throw error; // Re-throw to be caught by fetchData wrapper
        }
    };


    // ฟังก์ชันจัดการ Submit ฟอร์ม
    const handleSubmit = async (e) => {
        e.preventDefault(); // ป้องกันการ Submit แบบปกติของฟอร์ม

        // --- การตรวจสอบข้อมูล ---
        // ตรวจสอบว่าข้อมูลที่จำเป็นต้องกรอกครบหรือไม่ (Statement, Type, Description)
        // ✅ เอาเงื่อนไขบังคับเลือกไฟล์ออกแล้ว
        const isDataFilled = requirementStatement && requirementType && description;

        if (!isDataFilled) {
            Swal.fire({
                title: "ข้อมูลไม่ครบถ้วน",
                text: "กรุณากรอก Requirement Statement, Type และ Description", // ปรับข้อความแจ้งเตือน
                icon: "warning",
                confirmButtonText: "ตกลง",
            });
            return; // หยุดการทำงานถ้าข้อมูลไม่ครบ
        }

        // ตรวจสอบว่าข้อมูลมีการเปลี่ยนแปลงจากค่าเริ่มต้นหรือไม่ (รวมถึงไฟล์)
        const isDataUnchanged =
            requirementStatement === initialRequirementStatement &&
            requirementType === initialRequirementType &&
            description === initialDescription &&
            // เปรียบเทียบ Array ของ file IDs ต้อง Sort ก่อนเพื่อให้แน่ใจว่าลำดับไม่ส่งผลต่อการเปรียบเทียบ
            JSON.stringify(selectedFileIds.sort()) === JSON.stringify(initialSelectedFileIds.sort());

        if (isDataUnchanged) {
            Swal.fire({
                text: "ไม่มีการแก้ไขข้อมูล",
                icon: "info",
                timer: 1500, // แสดงผล 1.5 วินาทีแล้วปิดอัตโนมัติ
                showConfirmButton: false, // ซ่อนปุ่ม OK
            });
            return; // หยุดการทำงานถ้าไม่มีการเปลี่ยนแปลง
        }

        // --- กำหนดข้อความยืนยัน และสถานะใหม่ ---
        // Logic นี้กำหนดว่าถ้ามีการแก้ไข สถานะจะเปลี่ยนเป็น WORKING ยกเว้นถ้ามันเป็น WORKING อยู่แล้ว
        let confirmText = "ยืนยันการเปลี่ยนแปลงข้อมูล Requirement?";
        // newStatus จะถูกใช้เป็นสถานะที่จะส่งไป Backend ถ้า needsStatusUpdate เป็น true
        let newStatus = requirementStatus; // สถานะเริ่มต้นคือสถานะปัจจุบันที่ Fetch มา
        let needsStatusUpdate = false; // ธงเพื่อบอกว่าสถานะจะถูกเปลี่ยนใน Backend หรือไม่

        // กำหนดเงื่อนไขการเปลี่ยนสถานะ: ถ้าสถานะเดิมไม่ใช่ WORKING หรือเป็น BASELINE
        if (requirementStatus === "BASELINE") {
            confirmText = "Requirement นี้เป็น Baseline หากยืนยันการแก้ไข สถานะจะเปลี่ยนกลับเป็น 'WORKING' คุณต้องการดำเนินการต่อหรือไม่?";
            newStatus = "WORKING"; // กำหนดสถานะใหม่ให้เป็น WORKING
            needsStatusUpdate = true; // สถานะมีการเปลี่ยนแปลง
        } else if (requirementStatus !== "WORKING") {
             // ถ้าสถานะปัจจุบันไม่ใช่ WORKING (เช่น DRAFT, REJECTED ฯลฯ) และมีการแก้ไข
             // ให้เปลี่ยนสถานะกลับเป็น WORKING (ปรับตามกฎ business logic ของคุณ)
            confirmText = `ยืนยันการแก้ไข Requirement? (สถานะปัจจุบัน: ${requirementStatus} จะเปลี่ยนเป็น 'WORKING')`;
            newStatus = "WORKING";
            needsStatusUpdate = true;
        }
        // ถ้าสถานะปัจจุบันเป็น WORKING อยู่แล้ว และมีการแก้ไข:
        // - needsStatusUpdate จะยังคงเป็น false
        // - newStatus จะยังคงเป็น "WORKING" (เพราะค่าเริ่มต้นคือ requirementStatus)
        // - confirmText จะเป็น "ยืนยันการเปลี่ยนแปลงข้อมูล Requirement?" ปกติ

        // --- แสดง Popup ยืนยันก่อนทำการ Submit จริง ---
        const result = await Swal.fire({
            title: needsStatusUpdate ? "คำเตือนเรื่องสถานะ!" : "ยืนยันการแก้ไข", // หัวข้อเปลี่ยนตามเงื่อนไขสถานะ
            text: confirmText, // ใช้ข้อความยืนยันที่กำหนดไว้
            icon: "warning",
            showCancelButton: true, // แสดงปุ่มยกเลิก
            confirmButtonText: "ตกลง",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#3085d6", // สีปุ่มตกลง
            cancelButtonColor: "#d33", // สีปุ่มยกเลิก
        });

        // ถ้าผู้ใช้กดยกเลิกใน Popup ยืนยัน
        if (!result.isConfirmed) {
            console.log("Edit cancelled by user.");
            return; // หยุดการทำงาน
        }

        // --- เตรียมข้อมูลที่จะส่งไปอัปเดต Requirement หลัก ---
        const updatedRequirement = {
            requirement_name: requirementStatement,
            requirement_type: requirementType,
            requirement_description: description,
            project_id: projectId, // ส่ง projectId ไปด้วยเพื่อความถูกต้อง (backend อาจต้องการ)
            filereq_ids: selectedFileIds, // ส่ง Array ของ file IDs ไปเสมอ แม้จะว่างเปล่า
            // เพิ่มสถานะใหม่เข้าไปใน payload เฉพาะกรณีที่ logic ข้างบนบอกว่าสถานะมีการเปลี่ยนแปลง
            // ถ้า needsStatusUpdate เป็น true จะเพิ่ม requirement_status: newStatus เข้าไปใน object
            // Backend PUT endpoint ควรจัดการอัปเดต status เฉพาะเมื่อได้รับ field นี้
            ...(needsStatusUpdate && { requirement_status: newStatus })
        };

        console.log("Submitting updated requirement:", updatedRequirement);
        setIsLoading(true); // แสดงสถานะ Loading

        try {
            // --- เรียก API เพื่ออัปเดต Requirement หลัก (PUT /requirement/:id) ---
            // API นี้ควรจะอัปเดตข้อมูล Requirement ในตารางหลัก และจัดการความสัมพันธ์กับไฟล์ (ลบเก่า, เพิ่มใหม่)
            const response = await axios.put(
                `http://localhost:3001/requirement/${requirementId}`,
                updatedRequirement // ส่งข้อมูลที่เตรียมไว้
            );

            // --- ถ้าอัปเดต Requirement หลักสำเร็จ (สถานะ 200) ---
            if (response.status === 200) {
                console.log("Requirement updated successfully:", response.data);

                // ✅ *** จัดการ History ตามเงื่อนไขสถานะเดิมและสถานะใหม่ ***
                // Block นี้จะทำงานก็ต่อเมื่อข้อมูลมีการเปลี่ยนแปลง (เพราะเช็ค isDataUnchanged ไปแล้วด้านบน)
                try {
                     // ตรวจสอบสถานะ Requirement เดิม (initialRequirementStatus) ที่ Fetch มาตอนแรก
                    if (initialRequirementStatus === "WORKING") {
                        // เงื่อนไข: สถานะเดิมเป็น WORKING -> ไม่ต้องสร้างประวัติใหม่
                        // ให้เรียก API PUT ที่สร้างไว้ใหม่ (`/historyReqWorking/timestamp/:requirementId`) เพื่ออัปเดตแค่เวลาในประวัติล่าสุด
                        console.log(`Initial status was WORKING (${initialRequirementStatus}). Updating history timestamp for Req ID: ${requirementId}`);
                        const timestampUpdateResponse = await axios.put(
                            `http://localhost:3001/historyReqWorking/timestamp/${requirementId}` // เรียกใช้ API PUT ที่สร้างไว้ใหม่
                        );

                        // จัดการผลลัพธ์จากการเรียก API อัปเดต timestamp
                        if (timestampUpdateResponse.status !== 200) {
                            console.error(`Failed to update history timestamp for requirement ID: ${requirementId}. Status: ${timestampUpdateResponse.status}`, timestampUpdateResponse.data);
                            toast.warn(`Requirement updated, but failed to update history timestamp (REQ-${requirementId}).`);
                        } else {
                            console.log(`History timestamp updated successfully for Req ID ${requirementId}`);
                        }

                    } else {
                        // เงื่อนไข: สถานะเดิมไม่ใช่ WORKING -> สร้างประวัติใหม่
                        // (เพราะมีการแก้ไข และ logic ด้านบนกำหนดให้สถานะใหม่เป็น WORKING)
                        console.log(`Initial status was ${initialRequirementStatus} (not WORKING). Adding new history entry for Req ID: ${requirementId}`);

                        // เตรียมข้อมูลสำหรับประวัติใหม่ (ใช้ข้อมูลที่อัปเดตล่าสุดจาก updatedRequirement)
                        const historyReqData = {
                            requirement_id: requirementId,
                            requirement_name: updatedRequirement.requirement_name, // ใช้ข้อมูลที่อัปเดตล่าสุด
                            requirement_description: updatedRequirement.requirement_description,
                            requirement_type: updatedRequirement.requirement_type,
                            requirement_status: newStatus, // ใช้สถานะใหม่ (ซึ่งควรเป็น WORKING ตาม logic ด้านบน)
                        };
                        console.log("Sending new history data:", historyReqData);

                        // เรียก API POST เพื่อเพิ่มประวัติใหม่
                        const historyResponse = await axios.post(
                            "http://localhost:3001/historyReqWorking", // เรียก API POST เดิม (สำหรับสร้างใหม่)
                            historyReqData
                        );

                        // จัดการผลลัพธ์จากการเรียก API เพิ่มประวัติใหม่
                        if (historyResponse.status !== 200) {
                            console.error(`Failed to add new history after edit for requirement ID: ${requirementId}. Status: ${historyResponse.status}`, historyResponse.status, historyResponse.data);
                            toast.warn(`Requirement updated, but failed to record new history (REQ-${requirementId}).`);
                        } else {
                            console.log(`New history added successfully after edit for Req ID ${requirementId}`);
                        }
                    }
                } catch (historyError) {
                    // จัดการ Error ใดๆ ที่เกิดขึ้นในระหว่างการเรียก API History (ทั้ง POST และ PUT)
                    console.error(`Error handling history update for Req ID: ${requirementId}`, historyError.response?.data || historyError.message);
                    toast.error(`Requirement updated, but error handling history (REQ-${requirementId}). Check console.`);
                }
                // ✅ จบส่วนจัดการ History ตามเงื่อนไข


                // --- แสดงข้อความสำเร็จ และ Navigate ---
                // แสดง Popup สำเร็จ
                await Swal.fire({
                    title: "อัปเดตสำเร็จ!",
                    text: "Requirement ถูกอัปเดตเรียบร้อยแล้ว" + (needsStatusUpdate ? ` และสถานะเปลี่ยนเป็น ${newStatus}` : ""), // เพิ่มข้อความสถานะถ้ามีการเปลี่ยน
                    icon: "success",
                    timer: 2000, // แสดงผล 2 วินาที
                    showConfirmButton: false, // ไม่ต้องให้ผู้ใช้กดปุ่ม
                });

                // กลับไปหน้า Dashboard หรือหน้าที่เหมาะสม
                navigate(`/Dashboard?project_id=${projectId}`, {
                    state: { selectedSection: "Requirement" }, // ส่ง state ไปด้วยถ้าต้องการให้หน้า Dashboard เปิดแท็บ Requirement
                });

            } else {
                // กรณี status ไม่ใช่ 200 จากการเรียก API อัปเดต Requirement หลัก
                // โยน error เพื่อให้ถูกจับใน catch block ด้านนอก
                throw new Error(response.data.message || `Unexpected status code from update API: ${response.status}`);
            }
        } catch (error) {
            // --- จัดการ Error ใดๆ ที่เกิดขึ้นในระหว่างการ Submit (เช่น Network error, API หลักล่ม) ---
            console.error("Error during requirement submission:", error.response?.data || error.message);
            const errorMessage = error.response?.data?.message || error.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุในการอัปเดต Requirement";
            Swal.fire({
                title: "เกิดข้อผิดพลาด!",
                text: errorMessage,
                icon: "error",
                confirmButtonText: "ตกลง",
            });
        } finally {
             setIsLoading(false); // ซ่อนสถานะ Loading ไม่ว่าสำเร็จหรือล้มเหลว
        }
    };

    return (
        <div className="create-requirement-container">
            <h1 className="create-requirement-header">Update Requirement</h1>
            {isLoading && <p className="loading-message">Loading...</p>}
            {error && (
                <div className="error-container">
                    <p className="create-requirement-error">{error}</p>
                    {/* คุณอาจเพิ่มปุ่มเพื่อให้ผู้ใช้ลองใหม่ หรือกลับไปหน้าก่อนหน้า */}
                    {/* <button onClick={() => setError("")} className="clear-error-btn">Clear</button> */}
                </div>
            )}
            {/* แสดงฟอร์มต่อเมื่อโหลดเสร็จและไม่มี error ในการ fetch ครั้งแรก */}
            {!isLoading && !error && (
                 <form className="create-requirement-form" onSubmit={handleSubmit}>
                    <div className="create-requirement-form-group">
                        <label htmlFor="requirementStatement">Requirement Statement</label>
                        <input
                            type="text"
                            id="requirementStatement"
                            value={requirementStatement}
                            onChange={(e) => setRequirementStatement(e.target.value)}
                            placeholder="Enter requirement statement"
                            required
                            className="create-requirement-input"
                        />
                    </div>
                    <div className="create-requirement-form-group">
                        <label htmlFor="requirementType">Type</label>
                        <select
                            id="requirementType"
                            value={requirementType}
                            onChange={(e) => setRequirementType(e.target.value)}
                            required
                            className="create-requirement-select"
                        >
                            <option value="" disabled>Select Type</option>
                            {/* ตัวเลือก Type ต่างๆ */}
                            <option value="Functional">Functionality</option>
                            <option value="User interface">User interface</option>
                            <option value="External interfaces">External interfaces</option>
                            <option value="Reliability">Reliability</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Portability">Portability</option>
                            <option value="Limitations Design and construction">Limitations Design and construction</option>
                            <option value="Interoperability">Interoperability</option>
                            <option value="Reusability">Reusability</option>
                            <option value="Legal and regulative">Legal and regulative</option>
                        </select>
                    </div>
                    <div className="create-requirement-form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter requirement description"
                            rows="4"
                            required
                            className="create-requirement-textarea"
                        ></textarea>
                    </div>
                    <div className="create-requirement-form-groups"> {/* ใช้ class group เพื่อจัด spacing */}
                        {/* ✅ เอาข้อความบังคับออก -> เอาเงื่อนไขบังคับเลือกไฟล์ออกจาก isDataFilled แล้ว */}
                        <label htmlFor="fileSelect">Related File</label>
                        {/* React-Select component สำหรับเลือกไฟล์หลายไฟล์ */}
                        <Select
                            isMulti // อนุญาตให้เลือกได้หลายรายการ
                            options={uploadedFiles.map((file) => ({ // Map ข้อมูลไฟล์จาก backend ให้อยู่ในรูปแบบที่ React-Select ต้องการ
                                value: file.filereq_id, // ค่าที่จะเก็บ
                                label: `${file.filereq_id} - ${file.filereq_name}`, // ข้อความที่จะแสดง
                            }))}
                            value={uploadedFiles // กำหนดค่าที่ถูกเลือกในปัจจุบัน
                                .filter((file) => selectedFileIds.includes(file.filereq_id)) // กรองเฉพาะไฟล์ที่ IDs อยู่ใน selectedFileIds
                                .map((file) => ({ // Map ให้อยู่ในรูปแบบ value/label สำหรับ React-Select
                                    value: file.filereq_id,
                                    label: `${file.filereq_id} - ${file.filereq_name}`,
                                }))}
                            onChange={(selectedOptions) =>
                                // เมื่อมีการเปลี่ยนแปลง ให้ Update selectedFileIds โดยเอาเฉพาะค่า value มาเก็บใน Array
                                setSelectedFileIds((selectedOptions || []).map(option => option.value))
                            }
                            placeholder="Select Related File"
                            className="select-files" // ใช้ className เพื่อ Style
                            classNamePrefix="select-files" // สำหรับ Styling เพิ่มเติม
                        />
                         {/* อาจเพิ่มข้อความเตือนถ้าไม่มีไฟล์ใน selectedFileIds และฟอร์มถูกกดส่ง */}
                    </div>
                    <div className="create-requirement-form-buttons">
                        <button
                            type="button" // ใช้ type="button" เพื่อไม่ให้ Submit ฟอร์ม
                            className="create-requirement-btn-back"
                            onClick={() => navigate(-1)} // กลับไปหน้าก่อนหน้า
                        >
                            Back to Requirements
                        </button>
                        <button
                             type="submit" // ใช้ type="submit" เพื่อให้เรียก handleSubmit
                             className="create-requirement-btn-primary"
                             disabled={isLoading} // ปิดปุ่มตอนกำลังโหลด/ส่งข้อมูล
                        >
                            {isLoading ? 'Updating...' : 'Update'} {/* เปลี่ยนข้อความปุ่มระหว่างส่งข้อมูล */}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default UpdateRequirement;