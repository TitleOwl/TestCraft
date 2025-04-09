import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    forwardRef, // <--- เพิ่ม forwardRef
    useImperativeHandle // <--- เพิ่ม useImperativeHandle
} from 'react';
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import { toast } from 'react-toastify'; // ใช้ toast สำหรับแจ้งเตือนภายใน (เช่น export)

// --- Helper Function ---
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

// --- Component ย่อย Excalidraw ---
const ExcalidrawEditor = forwardRef(({ initialElements, onChange }, ref) => {
    const [excalidrawAPI, setExcalidrawAPI] = useState(null);
    // Expose methods ของ Excalidraw API ให้ parent (UpdateDiagram) ใช้ได้
    useImperativeHandle(ref, () => ({
        getElements: () => {
            return excalidrawAPI ? excalidrawAPI.getSceneElements() : [];
        },
        getAppState: () => {
            return excalidrawAPI ? excalidrawAPI.getAppState() : {};
        },
        getFiles: () => {
            return excalidrawAPI ? excalidrawAPI.getFiles() : {};
        }
    }));
    return (
        <Excalidraw
            excalidrawAPI={setExcalidrawAPI}
            initialData={{ elements: initialElements || [] }}
            onChange={onChange}
            // ตั้งค่าอื่นๆ ตามต้องการ เช่น UI options
            UIOptions={{
                canvasActions: {
                    // saveToActiveFile: false, // อาจจะซ่อนปุ่ม save ของ Excalidraw เอง
                    // loadScene: false,
                    export: false, // ซ่อนปุ่ม export เริ่มต้น ถ้าใช้ปุ่มของเราเอง
                    // clearCanvas: true, // แสดงปุ่ม Clear
                },
            }}
        />
    );
});

// --- UpdateDiagram Component หลัก (แก้ไขให้ใช้ forwardRef) ---
const UpdateDiagram = forwardRef(({ designId }, ref) => { // <--- ใช้ forwardRef และรับ ref
    const [initialElements, setInitialElements] = useState(null);
    const [currentElements, setCurrentElements] = useState(null);
    const [loading, setLoading] = useState(true);
    const [internalError, setInternalError] = useState(null); // State สำหรับ error ภายใน (เช่น fetch)
    const [isSaving, setIsSaving] = useState(false); // สถานะการบันทึกภายใน
    const [hasChanges, setHasChanges] = useState(false);

    const excalidrawEditorRef = useRef(null); // Ref สำหรับ ExcalidrawEditor ภายใน

    // --- Fetch ข้อมูล Diagram เดิม ---
    useEffect(() => {
        if (designId === undefined || designId === null || isNaN(designId)) {
            setInternalError("ไม่ได้รับ Design ID ที่ถูกต้อง");
            setLoading(false);
            setInitialElements([]);
            setCurrentElements([]);
            setHasChanges(false);
            return;
        }
        setLoading(true);
        setInternalError(null); // เคลียร์ error เก่า

        const fetchDiagramData = async () => {
            try {
                console.log(`UpdateDiagram: Fetching data for design ID ${designId}`);
                const response = await fetch(`http://localhost:3001/api/diagrams/design/${designId}`);
                if (!response.ok) {
                    if (response.status === 404) {
                        console.log(`UpdateDiagram: No diagram found for ${designId}. Starting empty.`);
                        setInitialElements([]);
                        setCurrentElements([]);
                        setHasChanges(false);
                    } else {
                        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
                        throw new Error(errorData.message || `Failed to fetch diagram: ${response.status}`);
                    }
                } else {
                    const data = await response.json();
                    const fetchedElements = Array.isArray(data.elements) ? data.elements : [];
                    if (!Array.isArray(data.elements)) console.warn("UpdateDiagram: Received data format unexpected.", data);
                    setInitialElements(fetchedElements);
                    setCurrentElements(fetchedElements);
                    setHasChanges(false);
                }
            } catch (err) {
                console.error("UpdateDiagram: Error fetching data:", err);
                const errorMsg = err.message || "เกิดข้อผิดพลาดในการโหลด Diagram";
                setInternalError(errorMsg); // เก็บ error ไว้แสดงผล
                toast.error(`ไม่สามารถโหลดข้อมูล Diagram: ${errorMsg}`);
                setInitialElements([]); // ตั้งค่าเริ่มต้นว่างๆ เมื่อเกิดข้อผิดพลาด
                setCurrentElements([]);
                setHasChanges(false);
            } finally {
                setLoading(false);
            }
        };
        fetchDiagramData();
    }, [designId]);

    // --- Handler เมื่อ Excalidraw มีการเปลี่ยนแปลง ---
    const handleOnChange = useCallback((elements) => {
        setCurrentElements(elements);
        const initialJson = initialElements ? JSON.stringify(initialElements) : '[]';
        setHasChanges(JSON.stringify(elements) !== initialJson);
    }, [initialElements]);

    // --- Function สำหรับการบันทึก (ภายใน, จะถูกเรียกโดย parent) ---
    const handleSaveDiagramInternal = useCallback(async () => {
        if (isNaN(designId)) {
            console.error('UpdateDiagram Internal Error: Invalid Design ID.');
            throw new Error('Invalid Design ID for saving diagram.'); // โยน Error ให้ Parent
        }
        if (!excalidrawEditorRef.current) {
            console.error('UpdateDiagram Internal Error: Editor ref not ready.');
            throw new Error('Diagram editor component is not ready.');
        }

        // ดึงข้อมูลล่าสุดจาก ExcalidrawEditor
        const elementsToSave = excalidrawEditorRef.current.getElements();

        // ไม่ต้องเช็ค hasChanges อีก เพราะ parent ควรเช็คก่อนเรียก
        setIsSaving(true);
        const payload = { elements: elementsToSave };

        try {
            console.log(`UpdateDiagram Internal Save: Sending PUT for ID ${designId}`);
            const response = await fetch(`http://localhost:3001/api/diagrams/design/${designId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
                throw new Error(errorData.message || `Failed to update diagram: ${response.status}`);
            }

            const result = await response.json();
            console.log('UpdateDiagram Internal Save: Success:', result);

            // สำคัญ: อัปเดต initialElements และรีเซ็ต hasChanges หลังบันทึกสำเร็จ
            setInitialElements(elementsToSave);
            setHasChanges(false);
            return true; // คืนค่า true บอกว่าสำเร็จ

        } catch (error) {
            console.error("UpdateDiagram Internal Save: Error:", error);
            // setError(error.message); // อาจจะไม่ต้อง set error ที่นี่ ปล่อยให้ parent จัดการ
            throw error; // โยน Error ให้ parent จัดการ และแสดงผล
        } finally {
            setIsSaving(false);
        }
    }, [designId, initialElements]); // initialElements เป็น dependency เพราะใช้เปรียบเทียบตอนต้น (ถ้าจะเช็คซ้ำ)

    // --- Function สำหรับ Export PNG ---
    const exportAsPng = async () => {
        if (!excalidrawEditorRef.current) {
            toast.warn("Diagram editor is not ready."); return;
        }
        const elements = excalidrawEditorRef.current.getElements();
        const appState = excalidrawEditorRef.current.getAppState();
        const files = excalidrawEditorRef.current.getFiles();
        if (!elements || elements.length === 0) {
            toast.info("ไม่มีข้อมูล Diagram สำหรับ Export!"); return;
        }
        try {
            const blob = await exportToBlob({ elements, appState: { ...appState, exportBackground: true, viewBackgroundColor: '#FFFFFF', exportPadding: 16 }, files, mimeType: "image/png", });
            downloadBlob(blob, `Diagram-Design-${designId}-${Date.now()}.png`);
            toast.success("Export Diagram เป็น PNG สำเร็จ!");
        } catch (error) {
            console.error("UpdateDiagram: Error exporting PNG:", error);
            toast.error("เกิดข้อผิดพลาดในการ Export PNG");
        }
    };

    // --- เปิดเผย Method ให้ Parent ผ่าน Ref ---
    useImperativeHandle(ref, () => ({
        hasUnsavedChanges: () => {
            // console.log(`UpdateDiagram check: hasChanges = ${hasChanges}`); // เปิด log ถ้าต้องการ debug
            return hasChanges;
        },
        saveDiagram: async () => {
            // เรียกใช้ logic การบันทึกภายใน
            return await handleSaveDiagramInternal();
        }
    }), [hasChanges, handleSaveDiagramInternal]); // Dependencies ที่สำคัญ

    // --- Render Logic ---
    if (loading) {
        return <div style={{ textAlign: 'center', padding: '20px' }}>Loading Diagram Data...</div>;
    }
    // แสดงข้อผิดพลาดตอนโหลด ถ้ามี
    if (internalError && initialElements === null) {
        return <div style={{ color: 'red', textAlign: 'center', padding: '20px' }}>Error: {internalError}</div>;
    }
    // กรณี Loading เสร็จ แต่ข้อมูลยังไม่พร้อม (ไม่ควรเกิด แต่ป้องกันไว้)
    if (initialElements === null) {
        return <div style={{ textAlign: 'center', padding: '20px' }}>Initializing Diagram Editor...</div>;
    }

    return (
        <div>
            {/* ส่วนแสดงผล Excalidraw */}
            <div style={{ height: "600px", border: '1px solid #ccc', position: 'relative', borderRadius: '4px', overflow: 'hidden' }}>
                {/* แสดงสถานะ Saving ภายใน */}
                {isSaving && <div style={{ position: 'absolute', top: '5px', right: '5px', zIndex: 10, background: 'rgba(255, 230, 150, 0.8)', padding: '3px 8px', borderRadius: '3px', fontSize: '0.8em', border: '1px solid #ccc' }}>Saving Diagram...</div>}
                <ExcalidrawEditor
                    ref={excalidrawEditorRef}
                    initialElements={initialElements}
                    onChange={handleOnChange}
                />
            </div>
            {/* ปุ่ม Export อาจจะยังคงไว้ */}
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <button
                    type="button"
                    onClick={exportAsPng}
                    disabled={isSaving}
                    className="diagram-button diagram-button-export"
                    title="ดาวน์โหลด Diagram เป็นไฟล์ PNG"
                >
                    Export PNG
                </button>
            </div>

            {/* CSS เฉพาะส่วนนี้ (ตัวอย่าง) */}
            <style jsx>{`
                .diagram-button { padding: 6px 12px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; background-color: #f8f9fa; transition: background-color 0.2s; font-size: 0.9em; }
                .diagram-button:hover:not(:disabled) { background-color: #e2e6ea; }
                .diagram-button:disabled { opacity: 0.6; cursor: not-allowed; }
                .diagram-button-export { /* อาจมี style เพิ่มเติม */ }
            `}</style>
        </div>
    );
});

export default UpdateDiagram;