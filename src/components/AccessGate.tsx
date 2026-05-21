import { useState } from 'react';
import { KeyRound, AlertCircle, ArrowRight } from 'lucide-react';
import { validateAccessCode } from '../config/daConfig';
import type { DepartamentoAcademico } from '../config/daConfig';

interface Props {
  onAuthenticated: (da: DepartamentoAcademico) => void;
}

const AccessGate: React.FC<Props> = ({ onAuthenticated }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const da = validateAccessCode(code);
    if (da) {
      setError('');
      onAuthenticated(da);
    } else {
      setError('Código de acceso inválido. Verifica e intenta nuevamente.');
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  };

  return (
    <div className="access-gate">
      <div className="access-box">
        <img src="/rea-logo.png" alt="Programa REA" className="access-gate-logo" />
        
        <form className="access-form" onSubmit={handleSubmit}>
          <h1>Resultados Encuesta Parcial</h1>
          <p>Ingrese el código de acceso de su Departamento Académico para continuar.</p>

          <div className="access-input-group">
            <label htmlFor="access-code">
              <KeyRound size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.35rem' }} />
              Código de acceso
            </label>
            <input
              id="access-code"
              type="text"
              className={`access-input ${shaking ? 'error' : ''}`}
              placeholder="CODIGO DE ACCESO"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error) setError('');
              }}
              autoFocus
              autoComplete="off"
            />
            {error && (
              <div className="access-error-msg">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
          </div>

          <button type="submit" className="access-submit-btn">
            Ingresar al Dashboard
            <ArrowRight size={18} style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
          </button>

          <div className="access-hint">
            <p>💡Consulte con el administrador del Programa REA si no cuenta con su código.</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccessGate;
