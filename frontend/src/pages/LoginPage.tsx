import React, { useState } from 'react';
import { login } from '../services/auth';

const LoginPage: React.FC<{ onLoginSuccess: (token: string) => void }> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await login(username, password);
      if (data.access_token) {
        onLoginSuccess(data.access_token);
      } else {
        setError("Réponse invalide du serveur.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="screen-shell">
      <section className="screen-panel screen-panel--narrow">
        <div className="screen-hero" style={{ marginBottom: 20 }}>
          <span className="screen-kicker">Accès sécurisé</span>
          <h1 className="screen-title" style={{ fontSize: '2.3rem' }}>Connexion à Intelli-GED</h1>
          <p className="screen-copy">
            Accède au chat documentaire et aux écrans d’administration avec un compte autorisé.
          </p>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">Nom d'utilisateur</span>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="field-input"
              placeholder="Nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Mot de passe</span>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="field-input"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error ? <div className="status-error">{error}</div> : null}

          <button
            type="submit"
            disabled={isLoading}
            className="button-primary"
          >
            {isLoading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>
      </section>
    </main>
  );
};

export default LoginPage;
