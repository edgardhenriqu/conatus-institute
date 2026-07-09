// react-quill-new: fork do react-quill compatível com React 19 (sem findDOMNode)
import { useCallback, useEffect, useMemo, useRef } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { adminApi } from '../../services/adminApi';
import { useToast } from '../ui/Toast';
import ImageResize, { PositionedImage } from './quillImageResize';

Quill.register('modules/imageResize', ImageResize, true);
// Substitui o blot 'image' padrão por um que preserva o `style` (posição) ao
// recarregar o HTML salvo. Sem isso o deslocamento se perde ao reabrir a aula.
Quill.register(PositionedImage, true);

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ align: [] }],
  ['link', 'image'],
  ['clean'],
];

// No Quill 2, 'list' cobre ordered e bullet — registrar 'bullet' separado causa erro
const FORMATS = ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'align', 'link', 'image'];

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

  // Mesmo motivo do handler acima: o uploader padrão do Quill (usado quando a
  // imagem é solta ou colada no editor) também embutia data URI base64.
  const handleUpload = useCallback(async (range, files) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    let index = range.index;
    for (const file of files) {
      try {
        const { url } = await adminApi.uploadCourseImage(file);
        editor.insertEmbed(index, 'image', url, 'user');
        index += 1;
      } catch (err) {
        toastRef.current.error(err.message || 'Erro ao enviar a imagem.');
        return;
      }
    }
    editor.setSelection(index, 0);
  }, []);

  const modules = useMemo(() => ({
    toolbar: { container: TOOLBAR, handlers: { image: handleImage } },
    uploader: { mimetypes: TIPOS_IMAGEM.split(','), handler: handleUpload },
    imageResize: true,
  }), [handleImage, handleUpload]);

  // O módulo prende listeners em document/window; sem isso eles sobrevivem
  // ao desmonte do editor. Guardamos a instância porque o ref já pode estar
  // nulo quando a limpeza roda.
  useEffect(() => {
    const resize = quillRef.current?.getEditor()?.getModule('imageResize');
    return () => resize?.destroy();
  }, []);

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
