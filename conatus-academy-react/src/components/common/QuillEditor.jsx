// react-quill-new: fork do react-quill compatível com React 19 (sem findDOMNode)
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['clean'],
  ],
};

// No Quill 2, 'list' cobre ordered e bullet — registrar 'bullet' separado causa erro
const FORMATS = ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'link', 'image'];

export default function QuillEditor({ value, onChange, placeholder = 'Escreva o conteúdo da aula...' }) {
  // A altura é controlada via CSS (.quill-editor .ql-container) para que o
  // texto role DENTRO da caixa em vez de transbordar sobre os botões abaixo.
  // Obs.: o HTML emitido contém &nbsp; no lugar de espaços (bug do Quill 2) —
  // normalize com utils/quillHtml.js ao salvar/renderizar.
  return (
    <div className="quill-editor">
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        modules={MODULES}
        formats={FORMATS}
      />
    </div>
  );
}
