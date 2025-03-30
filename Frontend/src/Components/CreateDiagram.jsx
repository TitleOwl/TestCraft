import React, { useState, useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";

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
    const { initialElements, designId } = props; // รับ initialElements และ designId จาก props
    const [excalidrawAPI, setExcalidrawAPI] = useState(null);
    const [elements, setElements] = useState(initialElements || []); // ใช้ initialElements เป็นข้อมูลเริ่มต้น

    useEffect(() => {
        if (initialElements) {
            setElements(initialElements);
        }
    }, [initialElements]);

    const handleOnChange = useCallback((elements, appState) => {
        setElements(elements);
    }, []);

    const saveDataToDatabaseInternal = async (designIdParam) => {
        const designIdToUse = designIdParam || designId;
        if (typeof designIdToUse !== 'number') {
            alert('ไม่พบ Design ID ที่ถูกต้องสำหรับบันทึก Diagram');
            return false;
        }
    
        const currentElements = excalidrawAPI.getSceneElements();
        if (!currentElements || currentElements.length === 0) {
            console.log("ไม่มีข้อมูล Diagram ให้บันทึก");
            return true;
        }
    
        const payload = {
            elements: currentElements,
            design_id: designIdToUse
        };
    
        try {
            const response = await fetch('http://localhost:3001/api/diagrams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
    
            if (!response.ok) {
                throw new Error(`เกิดข้อผิดพลาดจาก Server: ${response.status}`);
            }
    
            console.log('บันทึก Diagram สำเร็จ');
            return true;
        } catch (error) {
            console.error("เกิดข้อผิดพลาดในการบันทึก Diagram:", error);
            return false;
        }
    };
    

    const exportAsPng = async () => {
        // ... (โค้ด exportAsPng ของคุณ) ...
    };

    useImperativeHandle(ref, () => ({
        saveDiagram: async (designIdParam) => {
            if (!designIdParam) {
                console.error("Design ID is required for saving the diagram.");
                return false;
            }
            return await saveDataToDatabaseInternal(designIdParam);
        },
        hasUnsavedChanges: () => {
            return JSON.stringify(elements) !== JSON.stringify(initialElements || []);
        }
    }));

    return (
        <>
            <div style={{ textAlign: 'center', marginBottom: '10px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={exportAsPng}>Export Diagram as PNG</button>
            </div>
            <div style={{ height: "500px" }}>
                <Excalidraw
                    initialData={{ elements: elements }}
                    excalidrawAPI={(api) => setExcalidrawAPI(api)}
                    onChange={handleOnChange}
                />
            </div>
        </>
    );
});

export default CreateDiagram;