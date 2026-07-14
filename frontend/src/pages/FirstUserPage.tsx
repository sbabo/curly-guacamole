import { useState } from "react"

import { bootstrapFirstUser } from "../services/administration"

type FirstUserPageProps = {
    onCreated: () => void
}

function FirstUserPage({ onCreated }: FirstUserPageProps) {
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [fullName, setFullName] = useState("")
    const [password, setPassword] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState("")
    const [error, setError] = useState("")

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError("")
        setMessage("")
        setIsSubmitting(true)

        try {
            await bootstrapFirstUser({
                username,
                email,
                full_name: fullName,
                password,
                grade: "A",
            })
            setMessage("Le premier super-administrateur a été créé. Tu peux maintenant te connecter.")
            onCreated()
        } catch (exception: unknown) {
            setError(exception instanceof Error ? exception.message : "Impossible de créer le premier utilisateur")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <main className="screen-shell">
            <section className="screen-panel">
                <div className="screen-layout">
                    <div className="screen-hero">
                        <span className="screen-kicker">Premier démarrage</span>
                        <h1 className="screen-title">Créer le super-administrateur initial</h1>
                        <p className="screen-copy">
                            Aucune base utilisateur n’a encore été détectée. Ce formulaire initialise
                            le premier compte et verrouille le niveau d’administration avec une
                            permission exclusive.
                        </p>
                        <div className="pill-row">
                            <span className="pill">Grade: Direction administrative</span>
                            <span className="pill">Droit: Super-administrateur</span>
                            <span className="pill">A1 verrouillé</span>
                        </div>
                        {message ? <div className="status-success">{message}</div> : null}
                        {error ? <div className="status-error">{error}</div> : null}
                    </div>

                    <form className="screen-side form-grid" onSubmit={handleSubmit}>
                        <div className="form-grid form-grid--two-cols">
                            <label className="field">
                                <span className="field-label">Nom d'utilisateur</span>
                                <input
                                    className="field-input"
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(event) => setUsername(event.target.value)}
                                />
                            </label>
                            <label className="field">
                                <span className="field-label">Adresse e-mail</span>
                                <input
                                    className="field-input"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                />
                            </label>
                        </div>

                        <label className="field">
                            <span className="field-label">Nom complet</span>
                            <input
                                className="field-input"
                                type="text"
                                required
                                value={fullName}
                                onChange={(event) => setFullName(event.target.value)}
                            />
                        </label>

                        <label className="field">
                            <span className="field-label">Mot de passe initial</span>
                            <input
                                className="field-input"
                                type="password"
                                required
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                            />
                        </label>

                        <div className="form-grid form-grid--two-cols">
                            <div className="field">
                                <span className="field-label">Grade métier</span>
                                <input className="field-input" type="text" value="Direction administrative" readOnly />
                            </div>
                            <div className="field">
                                <span className="field-label">Permission</span>
                                <input className="field-input" type="text" value="Super-administrateur" readOnly />
                                <span className="field-help">A1 est imposé et non modifiable.</span>
                            </div>
                        </div>

                        <div className="button-row">
                            <button className="button-primary" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Création en cours..." : "Créer le premier compte"}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </main>
    )
}

export default FirstUserPage