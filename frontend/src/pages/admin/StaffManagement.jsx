/**
 * src/pages/admin/StaffManagement.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Screen 18: Staff Management
 * - Eyebrow: "18 / STAFF MANAGEMENT"
 * - Title: "Staff accounts"
 * - Subtitle: "Create staff accounts and assign roles. Only Admin can deactivate."
 * - Top right: Role filter and "+ Add staff" button
 * - Left column: Table with Name, Role, Email, Status (Active/Inactive pill), Last login, Action
 * - Right column: Add staff panel (Full name, Username, Email, Role, Temp password)
 *   When row is selected -> Edit staff panel (Name, Phone, Role, Active toggle, Optional password)
 * - Self-deactivation and last active admin protection
 */

import React, { useState, useEffect, useCallback } from "react";
import Card from "../../components/Card";
import Button from "../../components/Button";
import StatusPill from "../../components/StatusPill";
import FormField from "../../components/FormField";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../auth/AuthContext";
import { fetchStaff, createStaff, updateStaff } from "../../api/admin";
import { ROLE_LABELS, ROLES } from "../../auth/roles";
import { formatDateTime } from "../../utils/format";

const ROLE_OPTIONS = [
  { value: ROLES.ADMIN, label: "Admin" },
  { value: ROLES.WAITER, label: "Waiter" },
  { value: ROLES.CHEF, label: "Kitchen Staff (Chef)" },
  { value: ROLES.CASHIER, label: "Cashier" },
];

export function StaffManagement() {
  const { user: currentAdmin } = useAuth();
  const { showToast } = useToast();

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Panel Mode: 'add' or 'edit'
  const [panelMode, setPanelMode] = useState("add");
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState(ROLES.WAITER);
  const [formPassword, setFormPassword] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchStaff({ role: roleFilter, search });
      setStaffList(res?.staff || []);
    } catch (err) {
      showToast(err.message || "Failed to load staff list", "error");
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search, showToast]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleAddNew = () => {
    setPanelMode("add");
    setSelectedStaff(null);
    setFormName("");
    setFormUsername("");
    setFormEmail("");
    setFormPhone("");
    setFormRole(ROLES.WAITER);
    setFormPassword("");
    setFormIsActive(true);
    setFormError("");
  };

  const handleSelectEdit = (member) => {
    setPanelMode("edit");
    setSelectedStaff(member);
    setFormName(member.name || "");
    setFormUsername(member.username || "");
    setFormEmail(member.email || "");
    setFormPhone(member.phone || "");
    setFormRole(member.role || ROLES.WAITER);
    setFormPassword(""); // Left empty unless changing password
    setFormIsActive(member.is_active !== undefined ? member.is_active : true);
    setFormError("");
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formName.trim()) {
      setFormError("Full name is required.");
      return;
    }

    try {
      setSaving(true);
      if (panelMode === "add") {
        if (!formUsername.trim()) {
          setFormError("Username is required.");
          return;
        }
        if (!formEmail.trim()) {
          setFormError("Email address is required.");
          return;
        }
        if (!formPassword || formPassword.length < 6) {
          setFormError("Temporary password must be at least 6 characters.");
          return;
        }

        await createStaff({
          name: formName.trim(),
          username: formUsername.trim(),
          email: formEmail.trim(),
          role: formRole,
          password: formPassword,
          phone: formPhone.trim() || null,
        });

        showToast(`Staff account for ${formName} created.`, "success");
        handleAddNew();
      } else {
        // Edit mode
        const updatePayload = {
          name: formName.trim(),
          phone: formPhone.trim() || null,
          role: formRole,
          is_active: formIsActive,
        };
        if (formPassword && formPassword.trim().length >= 6) {
          updatePayload.password = formPassword.trim();
        }

        await updateStaff(selectedStaff.staff_id, updatePayload);
        showToast(`Staff account ${formName} updated.`, "success");
      }
      await loadStaff();
    } catch (err) {
      setFormError(err.message || "Failed to process staff account operation.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedStaff) return;
    try {
      setSaving(true);
      setFormError("");
      await updateStaff(selectedStaff.staff_id, { is_active: false });
      setFormIsActive(false);
      showToast(`Account for ${selectedStaff.name} has been deactivated.`, "info");
      await loadStaff();
    } catch (err) {
      setFormError(err.message || "Failed to deactivate staff member.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border)",
    backgroundColor: "#FFFFFF",
    color: "var(--color-text-main)",
    fontSize: "0.875rem",
    outline: "none",
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "var(--spacing-lg)",
          flexWrap: "wrap",
          gap: "var(--spacing-md)",
        }}
      >
        <div>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--color-text-muted)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            18 / STAFF MANAGEMENT
          </span>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-text-main)", marginTop: "2px" }}>
            Staff accounts
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", marginTop: "2px" }}>
            Create staff accounts and assign roles. Only Admin can deactivate.
          </p>
        </div>

        {/* Top Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search by name, username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, width: "220px" }}
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ ...inputStyle, width: "160px" }}
          >
            <option value="all">All Roles</option>
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <Button variant="primary" onClick={handleAddNew} style={{ padding: "8px 14px" }}>
            + Add staff
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Table (1.6fr), Right Form Panel (1fr) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "var(--spacing-lg)" }}>
        {/* Left: Staff Table */}
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--color-bg-page)", borderBottom: "1px solid var(--color-border)" }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--color-text-muted)" }}>Name</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--color-text-muted)" }}>Role</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--color-text-muted)" }}>Email</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", color: "var(--color-text-muted)" }}>Status</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: "var(--color-text-muted)" }}>Last login</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", color: "var(--color-text-muted)" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "var(--spacing-xl)", textAlign: "center", color: "var(--color-text-muted)" }}>
                      Loading staff roster...
                    </td>
                  </tr>
                ) : staffList.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "var(--spacing-xl)", textAlign: "center", color: "var(--color-text-muted)" }}>
                      No staff accounts found.
                    </td>
                  </tr>
                ) : (
                  staffList.map((member) => {
                    const isSelected = selectedStaff?.staff_id === member.staff_id;
                    const isSelf = currentAdmin?.staff_id === member.staff_id;
                    return (
                      <tr
                        key={member.staff_id}
                        style={{
                          borderBottom: "1px solid var(--color-border-subtle)",
                          backgroundColor: isSelected ? "var(--color-primary-subtle)" : "transparent",
                          cursor: "pointer",
                        }}
                        onClick={() => handleSelectEdit(member)}
                      >
                        <td style={{ padding: "12px", fontWeight: 600 }}>
                          <div>{member.name} {isSelf && <span style={{ fontSize: "0.75rem", color: "var(--color-primary)" }}>(You)</span>}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 400 }}>
                            @{member.username}
                          </div>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span style={{ textTransform: "capitalize", fontWeight: 500 }}>
                            {ROLE_LABELS[member.role] || member.role}
                          </span>
                        </td>
                        <td style={{ padding: "12px", color: "var(--color-text-muted)" }}>{member.email}</td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <StatusPill variant={member.is_active ? "green" : "grey"}>
                            {member.is_active ? "Active" : "Inactive"}
                          </StatusPill>
                        </td>
                        <td style={{ padding: "12px", color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
                          {member.last_login ? formatDateTime(member.last_login) : "Never"}
                        </td>
                        <td style={{ padding: "12px", textAlign: "right" }}>
                          <Button
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectEdit(member);
                            }}
                            style={{ padding: "4px 10px", fontSize: "0.775rem" }}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: "var(--spacing-md)", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
            Total registered staff: {staffList.length}
          </div>
        </Card>

        {/* Right: Add / Edit Staff Side Panel */}
        <Card
          title={panelMode === "add" ? "Add staff account" : `Edit staff: ${selectedStaff?.name}`}
          subtitle={
            panelMode === "add"
              ? "Provision login credentials and assign system role"
              : `Updating permissions for @${selectedStaff?.username}`
          }
        >
          {formError && (
            <div
              style={{
                padding: "8px 12px",
                backgroundColor: "var(--pill-red-bg)",
                color: "var(--pill-red-text)",
                border: "1px solid var(--pill-red-border)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.825rem",
                marginBottom: "var(--spacing-md)",
              }}
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleFormSubmit}>
            <FormField label="Full Name" id="staffName" required>
              <input
                id="staffName"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Maria Rossi"
                style={inputStyle}
              />
            </FormField>

            {panelMode === "add" ? (
              <>
                <FormField label="Username" id="staffUsername" required>
                  <input
                    id="staffUsername"
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="e.g. mrossi"
                    style={inputStyle}
                  />
                </FormField>

                <FormField label="Staff Email" id="staffEmail" required>
                  <input
                    id="staffEmail"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. mrossi@resto.test"
                    style={inputStyle}
                  />
                </FormField>
              </>
            ) : (
              <div style={{ marginBottom: "var(--spacing-sm)", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                <span>Username: <strong>@{formUsername}</strong> · Email: <strong>{formEmail}</strong></span>
              </div>
            )}

            <FormField label="Phone (optional)" id="staffPhone">
              <input
                id="staffPhone"
                type="text"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="e.g. 555-0105"
                style={inputStyle}
              />
            </FormField>

            <FormField label="Assigned Role" id="staffRole" required>
              <select
                id="staffRole"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                style={inputStyle}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label={panelMode === "add" ? "Temporary Password (min 6 chars)" : "Reset Password (leave blank to keep current)"}
              id="staffPassword"
              required={panelMode === "add"}
            >
              <input
                id="staffPassword"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder={panelMode === "add" ? "Set temporary password" : "New password (optional)"}
                style={inputStyle}
              />
            </FormField>

            {panelMode === "edit" && (
              <div style={{ marginBottom: "var(--spacing-md)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.875rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                  />
                  <span>Account Active (can sign in)</span>
                </label>
              </div>
            )}

            <div style={{ display: "flex", gap: "var(--spacing-sm)", marginTop: "var(--spacing-md)" }}>
              <Button type="submit" variant="primary" disabled={saving} style={{ flex: 1 }}>
                {saving ? "Saving..." : panelMode === "add" ? "Create account" : "Save changes"}
              </Button>

              {panelMode === "edit" && formIsActive && (
                <Button
                  type="button"
                  variant="danger"
                  disabled={saving || (currentAdmin?.staff_id === selectedStaff?.staff_id)}
                  onClick={handleDeactivate}
                  title={currentAdmin?.staff_id === selectedStaff?.staff_id ? "Cannot deactivate own admin account" : "Deactivate account"}
                >
                  Deactivate
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default StaffManagement;
