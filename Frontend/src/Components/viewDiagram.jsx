import React, { useState, useEffect } from 'react';
// Removed useParams if we rely on props
import { Excalidraw } from '@excalidraw/excalidraw';

// Receive designId as a prop
function ViewDiagram({ designId }) {
    const [elements, setElements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Check if designId prop is valid before fetching
        if (!designId || isNaN(parseInt(designId, 10))) {
            setError("Invalid or missing Design ID provided.");
            setLoading(false);
            setElements([]); // Clear elements if ID is invalid
            return; // Stop fetching
        }

        const fetchDiagram = async () => {
            setLoading(true);
            setError(null);
            try {
                // Use the designId prop in the fetch URL
                const response = await fetch(`http://localhost:3001/api/diagrams/design/${designId}`);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setElements(data.elements || []); // Use empty array if no elements found
            } catch (err) {
                console.error("Failed to fetch diagram:", err);
                setError(err.message || "Failed to load diagram.");
                setElements([]); // Clear elements on error
            } finally {
                setLoading(false);
            }
        };

        fetchDiagram();
    }, [designId]); // Re-run effect if designId prop changes

    if (loading) {
        return <div>Loading Diagram...</div>;
    }

    if (error) {
        return <div style={{ color: 'red' }}>Error loading diagram: {error}</div>;
    }

    return (
        <div className="diagram-viewer-container"> {/* Added a wrapper class */}
            {/* Removed h1, parent component has title */}
            <div style={{ height: '600px', border: '1px solid #ccc', marginTop: '15px' /* Added some margin */ }}>
                {elements.length > 0 ? (
                    <Excalidraw
                        initialData={{ elements }}
                        viewModeEnabled={true} // View-only mode
                    />
                ) : (
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                        <p>No diagram data found or saved for this design yet.</p>
                        {/* Optionally add a button/link to edit or create */}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ViewDiagram;