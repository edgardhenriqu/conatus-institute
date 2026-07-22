import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from './Toast';

/**
 * Botão "Tenho interesse" para cursos em breve. Alterna o registro do aluno
 * logado. A contagem de demanda é métrica interna e NÃO aparece no botão: o
 * aluno nem recebe o número (filtrado no servidor) e, para o admin, o badge é
 * ocultado aqui — a demanda é consultada no painel admin. O admin acompanha
 * pelas telas de /admin (AdminCursos / CourseEditor).
 *
 * Autossuficiente: guarda o próprio estado a partir de `curso.interesseRegistrado`
 * e `curso.totalInteresse`. `onChange` propaga o novo total para quem quiser.
 */
export function InterestButton({ curso, size = 'md', showCount = true, onChange }) {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [registrado, setRegistrado] = useState(Boolean(curso.interesseRegistrado));
  const [total, setTotal] = useState(curso.totalInteresse || 0);
  const [busy, setBusy] = useState(false);

  const toggle = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!user) {
      toast.warning('Entre na sua conta para registrar seu interesse.');
      navigate('/login', { state: { from: `/cursos/${curso.id}` } });
      return;
    }
    setBusy(true);
    try {
      const data = registrado
        ? await api.removerInteresse(curso.id)
        : await api.registrarInteresse(curso.id);
      setRegistrado(Boolean(data.interesse_registrado));
      setTotal(data.total_interesse || 0);
      onChange?.(data);
      if (!registrado) {
        toast.success('Interesse registrado! Avisaremos quando o curso for lançado. 🎉');
      }
    } catch (err) {
      toast.error(err.message || 'Não foi possível registrar seu interesse.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={registrado}
      className={`interest-btn interest-btn--${size} ${registrado ? 'interest-btn--on' : ''}`}
    >
      <span className="interest-btn__label">
        {registrado ? '✓ Interesse registrado' : '☆ Tenho interesse'}
      </span>
      {showCount && !isAdmin && total > 0 && (
        <span className="interest-btn__count" title={`${total} ${total === 1 ? 'pessoa interessada' : 'pessoas interessadas'}`}>
          {total}
        </span>
      )}
    </button>
  );
}
