import { useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['clean'],
  ],
};

const FORMATS = ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'bullet', 'link', 'image'];

export default function QuillEditor({ value, onChange, placeholder = 'Escreva o conteúdo da aula...' }) {
  const quillRef = useRef(null);

  return (
    <ReactQuill
      ref={quillRef}
      theme="snow"
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      modules={MODULES}
      formats={FORMATS}
      style={{ height: '300px', marginBottom: '20px' }}
    />
  );
}
