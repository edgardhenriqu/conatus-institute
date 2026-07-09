// react-quill-new: fork do react-quill compatível com React 19 (sem findDOMNode)
import { useCallback, useEffect, useMemo, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { adminApi } from '../../services/adminApi';
import { useToast } from '../ui/Toast';

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'image'],
  ['clean'],
];

// No Quill 2, 'list' cobre ordered e bullet — registrar 'bullet' separado causa erro
const FORMATS = ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'link', 'image'];

// Mesmos tipos aceitos pelo multer em server/src/routes/admin.js (SVG fica de fora).
const TIPOS_IMAGEM = 'image/png,image/jpeg,image/webp,image/gif';

export default function QuillEditor({ value, onChange, placeholder = 'Escreva o conteúdo da aula...' }) {
  const toast = useToast();
  const quillRef = useRef(null);
  // O handler roda dentro do Quill (fora do ciclo do React) e precisa enxergar
  // sempre o toast atual sem recriar `modules` — recriar remonta o editor.
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  // Substitui o handler padrão de imagem do Quill, que embutia o arquivo como
  // data URI base64 no HTML da aula. Além de inchar o conteúdo, um GIF animado
  // estourava o limite do body parser e a aula falhava ao salvar. Agora o
  // arquivo vai para /admin/upload/imagem e só a URL entra no conteúdo.
  const handleImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = TIPOS_IMAGEM;
    input.onchange = async () => {
      const file = input.files?.[0];
      const editor = quillRef.current?.getEditor();
      if (!file || !editor) return;
      // getSelection(true) foca o editor: sem foco o range vem nulo e a
      // imagem seria inserida na posição 0.
      const range = editor.getSelection(true);
      try {
        const { url } = await adminApi.uploadCourseImage(file);
        editor.insertEmbed(range.index, 'image', url, 'user');
        editor.setSelection(range.index + 1, 0);
      } catch (err) {
        toastRef.current.error(err.message || 'Erro ao enviar a imagem.');
      }
    };
    input.click();
  }, []);

  const modules = useMemo(() => ({
    toolbar: { container: TOOLBAR, handlers: { image: handleImage } },
  }), [handleImage]);

  // A altura é controlada via CSS (.quill-editor .ql-container) para que o
  // texto role DENTRO da caixa em vez de transbordar sobre os botões abaixo.
  // Obs.: o HTML emitido contém &nbsp; no lugar de espaços (bug do Quill 2) —
  // normalize com utils/quillHtml.js ao salvar/renderizar.
  return (
    <div className="quill-editor">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        modules={modules}
        formats={FORMATS}
      />
    </div>
  );
}
