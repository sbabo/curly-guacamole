import { useEffect, useMemo, useState } from "react"

import {
    createAdminUser,
    deleteAdminUser,
    fetchAdminUsers,
    fetchRightsCatalog,
    updateAdminUser,
    type AccessRight,
    type AdminUser,
    type RightsCatalog,
} from "../services/administration"

type AdminUsersPageProps = {
    onBack: () => void
    onLogout: () => void
}

type UserFormState = {
    username: string
    email: string
    fullName: string
    password: string
    grades: string[]
    permissions: string[]
}

type ModalMode = "create" | "edit"

type CurrentSelection = {
    grades: string[]
    permissions: string[]
}

function parseCodes(value: string): string[] {
    return value.split("").filter(Boolean)
}

function stringifyCodes(values: string[]): string {
    return values.join("")
}

function getRightLabel(code: string, catalog: AccessRight[]): string {
    return catalog.find((item) => item.code === code)?.label ?? code
}

function sortRightsByLabel(values: AccessRight[]): AccessRight[] {
    return [...values].sort((left, right) => left.label.localeCompare(right.label, "fr", { sensitivity: "base" }))
}

function formatRights(codes: string[], catalog: AccessRight[]): string {
    return codes
        .map((code) => ({ code, label: getRightLabel(code, catalog) }))
        .sort((left, right) => left.label.localeCompare(right.label, "fr", { sensitivity: "base" }))
        .map((item) => item.label)
        .join(", ")
}

function isExclusivePermission(code: string): boolean {
    return code === "1" || code === "2"
}

function hasExclusivePermission(values: string[]): boolean {
    return values.some(isExclusivePermission)
}

function defaultSelection(gradeOptions: AccessRight[], permissionOptions: AccessRight[]): CurrentSelection {
    const firstGrade = gradeOptions.at(0)?.code ?? "c"
    const defaultPermission = permissionOptions.find((permission) => !permission.exclusive)?.code ?? permissionOptions.at(0)?.code ?? "3"

    return {
        grades: [firstGrade],
        permissions: [defaultPermission],
    }
}

function normalizeSelection(values: string[], catalog: AccessRight[]): string[] {
    const available = catalog.map((item) => item.code)
    return available.filter((code) => values.includes(code))
}

function toggleValue(values: string[], value: string): string[] {
    return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function AdminUsersPage({ onBack, onLogout }: AdminUsersPageProps) {
    const [catalog, setCatalog] = useState<RightsCatalog | null>(null)
    const [users, setUsers] = useState<AdminUser[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [notice, setNotice] = useState("")
    const [error, setError] = useState("")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<ModalMode>("create")
    const [editingUserId, setEditingUserId] = useState<number | null>(null)
    const [form, setForm] = useState<UserFormState>({
        username: "",
        email: "",
        fullName: "",
        password: "",
        grades: [],
        permissions: [],
    })

    const gradeOptions = useMemo(() => sortRightsByLabel(catalog?.grades ?? []), [catalog])
    const permissionOptions = useMemo(() => sortRightsByLabel(catalog?.permissions ?? []), [catalog])

    async function reload() {
        setIsLoading(true)
        setError("")

        try {
            const [catalogData, usersData] = await Promise.all([
                fetchRightsCatalog(),
                fetchAdminUsers(),
            ])

            setCatalog(catalogData)
            setUsers(usersData)
        } catch (exception: any) {
            setError(exception.message || "Impossible de charger l'administration")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        void reload()
    }, [])

    function openCreateModal() {
        setModalMode("create")
        setEditingUserId(null)
        setForm({
            username: "",
            email: "",
            fullName: "",
            password: "",
            ...defaultSelection(gradeOptions, permissionOptions),
        })
        setNotice("")
        setError("")
        setIsModalOpen(true)
    }

    function openEditModal(user: AdminUser) {
        const firstRights = user.rights[0] ?? { grade: "", permission: "" }
        setModalMode("edit")
        setEditingUserId(user.id)
        setForm({
            username: user.username,
            email: user.email,
            fullName: user.full_name ?? "",
            password: "",
            grades: parseCodes(firstRights.grade),
            permissions: parseCodes(firstRights.permission),
        })
        setNotice("")
        setError("")
        setIsModalOpen(true)
    }

    function closeModal() {
        setIsModalOpen(false)
        setEditingUserId(null)
    }

    function permissionDisabled(code: string): boolean {
        if (isExclusivePermission(code)) {
            return form.permissions.some((permission) => !isExclusivePermission(permission) && permission !== code)
        }

        return hasExclusivePermission(form.permissions)
    }

    function togglePermission(code: string) {
        setForm((current) => {
            const nextPermissions = toggleValue(current.permissions, code)

            if (isExclusivePermission(code)) {
                return {
                    ...current,
                    permissions: nextPermissions.includes(code) ? [code] : [],
                }
            }

            if (nextPermissions.some(isExclusivePermission)) {
                return {
                    ...current,
                    permissions: nextPermissions.filter(isExclusivePermission),
                }
            }

            return {
                ...current,
                permissions: nextPermissions,
            }
        })
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsSubmitting(true)
        setNotice("")
        setError("")

        try {
            const payload = {
                username: form.username,
                email: form.email,
                full_name: form.fullName,
                password: form.password || undefined,
                grade: stringifyCodes(normalizeSelection(form.grades, gradeOptions)),
                permission: stringifyCodes(normalizeSelection(form.permissions, permissionOptions)),
            }

            if (modalMode === "create") {
                await createAdminUser(payload)
                setNotice(`L'utilisateur ${form.username} a été créé.`)
            } else if (editingUserId !== null) {
                await updateAdminUser(editingUserId, payload)
                setNotice(`L'utilisateur ${form.username} a été mis à jour.`)
            }

            closeModal()
            await reload()
        } catch (exception: any) {
            setError(exception.message || "Impossible d'enregistrer l'utilisateur")
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleDelete(user: AdminUser) {
        const confirmed = window.confirm(`Supprimer ou désactiver l'utilisateur ${user.username} ?`)
        if (!confirmed) {
            return
        }

        setIsSubmitting(true)
        setNotice("")
        setError("")

        try {
            await deleteAdminUser(user.id)
            setNotice(`L'utilisateur ${user.username} a été supprimé.`)
            await reload()
        } catch (exception: any) {
            setError(exception.message || "Impossible de supprimer l'utilisateur")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <main className="screen-shell">
            <section className="screen-panel screen-panel--wide">
                <div className="admin-topbar">
                    <div className="admin-topbar__title">
                        <span className="screen-kicker">Administration</span>
                        <h1 className="screen-title" style={{ fontSize: "2.2rem" }}>
                            Gestion des utilisateurs et des droits
                        </h1>
                        <p className="mini-muted">Tableau de lecture, modale pour créer ou modifier.</p>
                    </div>
                    <div className="admin-toolbar">
                        <button className="button-primary" type="button" onClick={openCreateModal}>
                            + Créer un utilisateur
                        </button>
                        <button className="button-secondary" type="button" onClick={onBack}>
                            Retour au chat
                        </button>
                        <button className="button-ghost" type="button" onClick={onLogout}>
                            Se déconnecter
                        </button>
                    </div>
                </div>

                {notice ? <div className="status-success" style={{ marginBottom: 16 }}>{notice}</div> : null}
                {error ? <div className="status-error" style={{ marginBottom: 16 }}>{error}</div> : null}

                {isLoading ? <div className="status-note">Chargement des comptes et des droits...</div> : null}

                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Utilisateur</th>
                                <th>Grade métier</th>
                                <th>Permission</th>
                                <th>Nom complet</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => {
                                const currentRights = user.rights[0] ?? { grade: "", permission: "" }

                                return (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="user-meta">
                                                <span className="user-name">{user.username}</span>
                                                <span className="user-email">{user.email}</span>
                                            </div>
                                        </td>
                                        <td>{formatRights(parseCodes(currentRights.grade), gradeOptions)}</td>
                                        <td>{formatRights(parseCodes(currentRights.permission), permissionOptions)}</td>
                                        <td>{user.full_name ?? ""}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="button-secondary" type="button" onClick={() => openEditModal(user)}>
                                                    Modifier
                                                </button>
                                                <button className="button-ghost" type="button" onClick={() => void handleDelete(user)} disabled={isSubmitting}>
                                                    Supprimer
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}

                            {!isLoading && users.length === 0 ? (
                                <tr>
                                    <td colSpan={5}>
                                        <div className="status-note">Aucun utilisateur n’est encore enregistré.</div>
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>

                {isModalOpen ? (
                    <div className="modal-backdrop" role="presentation" onClick={closeModal}>
                        <div className="modal-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
                            <div className="modal-header">
                                <div>
                                    <span className="screen-kicker">{modalMode === "create" ? "Création" : "Modification"}</span>
                                    <h2 className="section-title">
                                        {modalMode === "create" ? "Créer un utilisateur" : "Modifier un utilisateur"}
                                    </h2>
                                </div>
                                <button className="button-ghost" type="button" onClick={closeModal}>
                                    Fermer
                                </button>
                            </div>

                            <form className="form-grid" onSubmit={handleSubmit}>
                                <div className="form-grid form-grid--two-cols">
                                    <label className="field">
                                        <span className="field-label">Nom d'utilisateur</span>
                                        <input
                                            className="field-input"
                                            value={form.username}
                                            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                                            required
                                        />
                                    </label>
                                    <label className="field">
                                        <span className="field-label">Adresse e-mail</span>
                                        <input
                                            className="field-input"
                                            type="email"
                                            value={form.email}
                                            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                                            required
                                        />
                                    </label>
                                </div>

                                <label className="field">
                                    <span className="field-label">Nom complet</span>
                                    <input
                                        className="field-input"
                                        value={form.fullName}
                                        onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                                        required
                                    />
                                </label>

                                <label className="field">
                                    <span className="field-label">Mot de passe {modalMode === "edit" ? "(optionnel)" : ""}</span>
                                    <input
                                        className="field-input"
                                        type="password"
                                        value={form.password}
                                        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                                        required={modalMode === "create"}
                                    />
                                </label>

                                <div className="modal-checklists">
                                    <div className="field">
                                        <span className="field-label">Grade métier</span>
                                        <div className="checkbox-grid">
                                            {gradeOptions.map((grade) => (
                                                <label key={grade.code} className="checkbox-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={form.grades.includes(grade.code)}
                                                        onChange={() => {
                                                            setForm((current) => ({
                                                                ...current,
                                                                grades: toggleValue(current.grades, grade.code),
                                                            }))
                                                        }}
                                                    />
                                                    <span>
                                                        <strong>{grade.label}</strong>
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="field">
                                        <span className="field-label">Permissions</span>
                                        <div className="checkbox-grid">
                                            {permissionOptions.map((permission) => (
                                                <label key={permission.code} className="checkbox-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={form.permissions.includes(permission.code)}
                                                        disabled={permissionDisabled(permission.code)}
                                                        onChange={() => togglePermission(permission.code)}
                                                    />
                                                    <span>
                                                        <strong>{permission.label}</strong>
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                        <span className="field-help">1 et 2 restent exclusives.</span>
                                    </div>
                                </div>

                                <div className="button-row modal-actions">
                                    <button className="button-primary" type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? "Enregistrement..." : modalMode === "create" ? "Créer" : "Mettre à jour"}
                                    </button>
                                    <button className="button-secondary" type="button" onClick={closeModal}>
                                        Annuler
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : null}
            </section>
        </main>
    )
}

export default AdminUsersPage