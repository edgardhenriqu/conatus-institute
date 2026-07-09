import { Quill } from 'react-quill-new';

/**
 * Módulo do Quill que deixa a imagem ser manipulada direto no editor:
 *
 *   • arrastar a imagem a desloca livremente, para qualquer ponto — inclusive
 *     por cima do texto (position:relative + left/top em pixels);
 *   • arrastar as alças dos cantos redimensiona;
 *   • dois cliques devolvem a imagem à posição original (válvula de escape,
 *     já que um deslocamento grande pode jogá-la para fora da tela);
 *   • o botão de alinhamento da toolbar continua valendo para o parágrafo.
 *
 * O arraste é reimplementado aqui porque o módulo `uploader` do Quill 2 chama
 * preventDefault() em todo evento `drop` do editor, o que mata o
 * drag-and-drop nativo do contenteditable.
 *
 * A posição e o tamanho moram no próprio <img>: o tamanho no atributo `width`
 * e o deslocamento no `style`. O Quill 2 só preserva alt/height/width ao
 * recarregar o HTML salvo (formats/image.js), então PositionedImage abaixo
 * amplia essa lista para incluir `style` — sem isso, o deslocamento seria
 * silenciosamente descartado ao reabrir a aula.
 */

const BaseImage = Quill.import('formats/image');
const ATTRIBUTES = ['alt', 'height', 'width', 'style'];

export class PositionedImage extends BaseImage {
  static formats(domNode) {
    return ATTRIBUTES.reduce((formats, attribute) => {
      if (domNode.hasAttribute(attribute)) formats[attribute] = domNode.getAttribute(attribute);
      return formats;
    }, {});
  }

  format(name, value) {
    if (ATTRIBUTES.indexOf(name) > -1) {
      if (value) this.domNode.setAttribute(name, value);
      else this.domNode.removeAttribute(name);
    } else {
      super.format(name, value);
    }
  }
}

const MIN_WIDTH = 60;
const DRAG_THRESHOLD = 5;  // px antes de um clique virar arraste
const CORNERS = ['nw', 'ne', 'sw', 'se'];

export default class ImageResize {
  constructor(quill) {
    this.quill = quill;
    this.img = null;
    this.drag = null;
    this.move = null;

    this.overlay = document.createElement('div');
    this.overlay.className = 'ql-image-overlay';
    this.label = document.createElement('span');
    this.label.className = 'ql-image-size';
    this.overlay.appendChild(this.label);

    CORNERS.forEach((corner) => {
      const handle = document.createElement('span');
      handle.className = `ql-image-handle ql-image-handle-${corner}`;
      handle.addEventListener('mousedown', (e) => this.startResize(e, corner));
      this.overlay.appendChild(handle);
    });

    this.onEditorMouseDown = this.onEditorMouseDown.bind(this);
    this.onEditorDoubleClick = this.onEditorDoubleClick.bind(this);
    this.onDragStart = this.onDragStart.bind(this);
    this.onDocumentMouseDown = this.onDocumentMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMoveMouseMove = this.onMoveMouseMove.bind(this);
    this.onMoveMouseUp = this.onMoveMouseUp.bind(this);
    this.reposition = this.reposition.bind(this);

    quill.root.addEventListener('mousedown', this.onEditorMouseDown);
    quill.root.addEventListener('dblclick', this.onEditorDoubleClick);
    // Sem isto o navegador inicia seu próprio drag-and-drop (com imagem
    // fantasma) que o uploader do Quill depois cancela no drop.
    quill.root.addEventListener('dragstart', this.onDragStart);
    document.addEventListener('mousedown', this.onDocumentMouseDown);
    quill.container.addEventListener('scroll', this.reposition);
    window.addEventListener('resize', this.reposition);
    quill.on('text-change', this.reposition);
  }

  destroy() {
    this.hide();
    this.quill.root.removeEventListener('mousedown', this.onEditorMouseDown);
    this.quill.root.removeEventListener('dblclick', this.onEditorDoubleClick);
    this.quill.root.removeEventListener('dragstart', this.onDragStart);
    document.removeEventListener('mousedown', this.onDocumentMouseDown);
    this.quill.container.removeEventListener('scroll', this.reposition);
    window.removeEventListener('resize', this.reposition);
    this.quill.off('text-change', this.reposition);
    this.endResize();
    this.endMove();
  }

  // ── Seleção ────────────────────────────────────────────────────────────────

  onDragStart(e) {
    if (e.target?.tagName === 'IMG') e.preventDefault();
  }

  // Não damos preventDefault aqui: é o mousedown que faz o Quill posicionar a
  // seleção na imagem, e sem seleção o botão de alinhamento formataria o
  // parágrafo errado.
  onEditorMouseDown(e) {
    if (e.target?.tagName !== 'IMG') return this.hide();
    this.show(e.target);
    this.move = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: this.offsetOf(e.target).x,
      baseY: this.offsetOf(e.target).y,
      active: false,
    };
    document.addEventListener('mousemove', this.onMoveMouseMove);
    document.addEventListener('mouseup', this.onMoveMouseUp);
  }

  onEditorDoubleClick(e) {
    if (e.target?.tagName !== 'IMG') return;
    this.setOffset(e.target, 0, 0);
    this.commitStyle(e.target);
    this.reposition();
  }

  onDocumentMouseDown(e) {
    if (!this.img) return;
    const wrapper = this.quill.container.parentNode;
    if (!wrapper?.contains(e.target)) this.hide();
  }

  // O Quill serializa o outerHTML vivo do <img> (getSemanticHTML →
  // convertHTML), então qualquer classe que a gente pendure nele seria gravada
  // na aula. Por isso o estado visual da seleção mora todo no overlay.
  show(img) {
    this.img = img;
    this.quill.container.appendChild(this.overlay);
    this.reposition();
  }

  hide() {
    if (!this.img) return;
    this.overlay.remove();
    this.img = null;
  }

  reposition() {
    if (!this.img) return;
    if (!this.img.isConnected) return this.hide();  // imagem apagada

    const container = this.quill.container;
    const imgRect = this.img.getBoundingClientRect();
    const boxRect = container.getBoundingClientRect();

    // O overlay é filho absoluto do .ql-container (que rola), então rola junto
    // com o conteúdo — daí somar o scroll ao delta dos rects.
    this.overlay.style.left = `${imgRect.left - boxRect.left + container.scrollLeft}px`;
    this.overlay.style.top = `${imgRect.top - boxRect.top + container.scrollTop}px`;
    this.overlay.style.width = `${imgRect.width}px`;
    this.overlay.style.height = `${imgRect.height}px`;
    this.label.textContent = `${Math.round(imgRect.width)} px`;
  }

  // ── Posição (style inline) ─────────────────────────────────────────────────

  offsetOf(img) {
    return { x: parseFloat(img.style.left) || 0, y: parseFloat(img.style.top) || 0 };
  }

  setOffset(img, x, y) {
    if (x === 0 && y === 0) {
      img.style.removeProperty('position');
      img.style.removeProperty('left');
      img.style.removeProperty('top');
      return;
    }
    // relative (e não absolute) mantém a imagem ancorada no parágrafo: ela se
    // desloca visualmente sem deixar o fluxo e sem depender de um ancestral
    // posicionado no visualizador do curso.
    img.style.position = 'relative';
    img.style.left = `${Math.round(x)}px`;
    img.style.top = `${Math.round(y)}px`;
  }

  // O style entra no Delta via formato `style` (ver PositionedImage). Um
  // style="" vazio sujaria o HTML da aula, então some junto.
  commitStyle(img) {
    if (img.style.length === 0) img.removeAttribute('style');
    const blot = Quill.find(img);
    if (!blot) return;
    const index = this.quill.getIndex(blot);
    this.quill.formatText(index, 1, 'style', img.getAttribute('style') || '', 'user');
  }

  // ── Movimentação ───────────────────────────────────────────────────────────

  onMoveMouseMove(e) {
    if (!this.move || !this.img) return;
    if (!this.move.active) {
      const dist = Math.hypot(e.clientX - this.move.startX, e.clientY - this.move.startY);
      if (dist < DRAG_THRESHOLD) return;   // ainda é um clique, não um arraste
      this.move.active = true;
      this.overlay.classList.add('is-dragging');
      document.body.classList.add('ql-image-grabbing');
      // Sem isto o arraste também vai selecionando o texto por onde passa.
      this.quill.root.classList.add('ql-image-moving');
    }
    this.setOffset(
      this.img,
      this.move.baseX + (e.clientX - this.move.startX),
      this.move.baseY + (e.clientY - this.move.startY),
    );
    this.reposition();
  }

  onMoveMouseUp() {
    const move = this.move;
    const img = this.img;
    this.endMove();
    if (move?.active && img) this.commitStyle(img);
  }

  endMove() {
    if (this.move?.active) {
      this.overlay.classList.remove('is-dragging');
      document.body.classList.remove('ql-image-grabbing');
      this.quill.root.classList.remove('ql-image-moving');
    }
    this.move = null;
    document.removeEventListener('mousemove', this.onMoveMouseMove);
    document.removeEventListener('mouseup', this.onMoveMouseUp);
  }

  // ── Redimensionamento ──────────────────────────────────────────────────────

  maxWidth() {
    const root = this.quill.root;
    const style = getComputedStyle(root);
    return root.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  }

  startResize(e, corner) {
    if (!this.img) return;
    e.preventDefault();  // impede o browser de iniciar um drag-and-drop da imagem
    e.stopPropagation();
    this.endMove();
    this.drag = {
      startX: e.clientX,
      startWidth: this.img.getBoundingClientRect().width,
      sign: corner.endsWith('w') ? -1 : 1,
      max: this.maxWidth(),
    };
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    this.overlay.classList.add('is-resizing');
  }

  onMouseMove(e) {
    if (!this.drag || !this.img) return;
    const delta = (e.clientX - this.drag.startX) * this.drag.sign;
    const width = Math.min(Math.max(this.drag.startWidth + delta, MIN_WIDTH), this.drag.max);
    // Preview via style; o valor definitivo vira atributo `width` no mouseup.
    // setProperty (e não setAttribute) para não apagar o left/top da posição.
    this.img.style.width = `${Math.round(width)}px`;
    this.img.style.height = 'auto';
    this.reposition();
  }

  onMouseUp() {
    if (!this.drag || !this.img) return this.endResize();
    const width = Math.round(this.img.getBoundingClientRect().width);
    const img = this.img;
    this.endResize();
    this.applyWidth(img, width);
  }

  endResize() {
    this.drag = null;
    this.overlay.classList.remove('is-resizing');
    // Só as propriedades do preview saem; o deslocamento continua no style.
    this.img?.style.removeProperty('width');
    this.img?.style.removeProperty('height');
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }

  // formatText (e não setAttribute) para que a mudança entre no Delta, no
  // histórico de undo e no onChange do editor.
  applyWidth(img, width) {
    const blot = Quill.find(img);
    if (!blot) return;
    const index = this.quill.getIndex(blot);
    this.quill.formatText(index, 1, { width: String(width), height: '' }, 'user');
    this.commitStyle(img);
    this.reposition();
  }
}
