import React, { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";

// ฟังก์ชัน downloadBlob ไม่เปลี่ยนแปลง...
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

const CreateDiagram = forwardRef((props, ref) => {
    const [excalidrawAPI, setExcalidrawAPI] = useState(null);

    const handleOnChange = useCallback((elements, appState) => {
    }, []);

    const saveDataToDatabaseInternal = async (designIdToUse) => {
        if (!excalidrawAPI) {
            console.error("Excalidraw API ยังไม่พร้อมใช้งาน");
            alert("Excalidraw ยังไม่พร้อม โปรดลองอีกครั้ง");
            return false;
        }

        const currentElements = excalidrawAPI.getSceneElements();
        if (!currentElements || currentElements.length === 0) {
            console.log("ไม่มีข้อมูล Diagram ให้บันทึก");
            return true;
        }

        if (typeof designIdToUse !== 'number') {
            alert('ไม่พบ Design ID ที่ถูกต้องสำหรับบันทึก Diagram');
            console.error('Invalid designIdToUse passed:', designIdToUse);
            return false; 
        }

        const payload = {
            elements: currentElements,
            design_id: designIdToUse
        };

        const apiUrl = 'http://localhost:3001/api/diagrams';

        console.log("กำลังส่งข้อมูล Diagram ไปที่:", apiUrl);

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const responseData = await response.json();

            if (!response.ok) {
                console.error('Backend ตอบกลับ Error (Diagram Save):', response.status, responseData);
                throw new Error(responseData.message || `เกิดข้อผิดพลาดจาก Server: ${response.status}`);
            }

            console.log('Backend ตอบกลับ (Diagram Save):', responseData);
            return true;

        } catch (error) {
            console.error("เกิดข้อผิดพลาดในการเรียก API (Diagram Save):", error);
            alert(`เกิดข้อผิดพลาดในการบันทึก Diagram: ${error.message}`);
            return false;
        }
    };

    const exportAsPng = async () => {
        if (!excalidrawAPI) {
            console.error("Excalidraw API ยังไม่พร้อมใช้งาน");
            alert("Excalidraw ยังไม่พร้อม โปรดลองอีกครั้ง");
            return;
        }
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();
        const files = excalidrawAPI.getFiles();

        if (!elements || elements.length === 0) {
            alert("ไม่มีข้อมูลให้ Export!");
            return;
        }
        try {
            const blob = await exportToBlob({
                elements,
                appState: { ...appState, exportBackground: true, exportPadding: 16 },
                files,
                mimeType: "image/png",
            });
            downloadBlob(blob, `รูปวาด-${Date.now()}.png`);
        } catch (error) {
            console.error("เกิดข้อผิดพลาดในการ Export PNG:", error);
            alert("เกิดข้อผิดพลาดในการ Export เป็น PNG");
        }
    };

    useImperativeHandle(ref, () => ({
        triggerSave: async (designIdFromParent) => {
            return await saveDataToDatabaseInternal(designIdFromParent);
        }
    }));

    return (
        <>
            <div style={{ textAlign: 'center', marginBottom: '10px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                {/* อาจจะเก็บปุ่ม Export ไว้ */}
                <button onClick={exportAsPng}>Export Diagram as PNG</button>
            </div>
            <div style={{ height: "500px" }}>
                <Excalidraw
                    excalidrawAPI={(api) => setExcalidrawAPI(api)}
                    onChange={handleOnChange}
                />
            </div>
        </>
    );
}); // ปิด forwardRef

export default CreateDiagram;