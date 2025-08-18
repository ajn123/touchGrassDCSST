'use client';

import { useState, useEffect } from 'react';
import { useModal } from '../hooks/useModal';
import Modal from './Modal';

interface JsonEditorProps {
  eventId: string;
  initialData: any;
}

export function JsonEditor({ eventId, initialData }: JsonEditorProps) {
  const [jsonText, setJsonText] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const { showSuccess, modalState, hideModal } = useModal();

  useEffect(() => {
    setJsonText(JSON.stringify(initialData, null, 2));
  }, [initialData]);

  const validateJson = (text: string) => {
    try {
      JSON.parse(text);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setJsonText(text);
    setIsValid(validateJson(text));
    setError('');
  };

  const handleSave = async () => {
    if (!isValid) {
      setError('Invalid JSON format');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const parsedData = JSON.parse(jsonText);
      
      const response = await fetch(`/api/events/${encodeURIComponent(eventId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event');
      }

      const result = await response.json();
      setIsEditing(false);
      
      // Show success message and refresh the page
      showSuccess('Success!', 'Event updated successfully!');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setJsonText(JSON.stringify(initialData, null, 2));
    setIsEditing(false);
    setError('');
    setIsValid(true);
  };

  if (!isEditing) {
    return (
      <div className="mt-4">
        <h3 className="font-semibold text-gray-700 mb-2">Event JSON Data</h3>
        <div className="bg-gray-900 text-green-400 p-3 rounded border overflow-auto max-h-96">
          <pre className="text-xs">{jsonText}</pre>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Edit JSON
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h3 className="font-semibold text-gray-700 mb-2">Edit Event JSON</h3>
      
      <div className="mb-4">
        <textarea
          value={jsonText}
          onChange={handleTextChange}
          className={`w-full h-96 p-3 font-mono text-sm border rounded ${
            isValid ? 'border-gray-300' : 'border-red-500'
          } bg-gray-900 text-green-400`}
          placeholder="Enter valid JSON..."
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {!isValid && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          Invalid JSON format. Please fix the syntax errors before saving.
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!isValid || isSaving}
          className={`px-4 py-2 rounded transition-colors ${
            isValid && !isSaving
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
          }`}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
        
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-600">
        <strong>Warning:</strong> This will update the event in the database. Make sure the JSON is valid and contains all required fields.
      </div>

      {/* Notification Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={hideModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
      />
    </div>
  );
} 