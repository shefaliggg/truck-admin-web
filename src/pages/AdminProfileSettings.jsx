import React, { useState, useEffect } from "react";
import * as userService from "../services/user";
import * as authService from "../services/auth";
import FormField from "../components/FormField";
import "./AdminProfileSettings.css";

const EMPTY_PASSWORD_FORM = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function AdminProfileSettings() {
  const [formData, setFormData] = useState({
    dispatcherName: "",
    dispatcherEmail: "",
    dispatcherPhone: "",
    salespersonName: "",
    salespersonEmail: "",
    salespersonPhone: "",
  });
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const handlePasswordChange = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
    setPasswordErrors((prev) => ({ ...prev, [field]: "", form: "" }));
    setPasswordSuccess("");
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    const errors = {};
    if (!currentPassword) errors.currentPassword = "Required";
    if (!newPassword) errors.newPassword = "Required";
    else if (newPassword.length < 8) errors.newPassword = "Must be at least 8 characters";
    else if (newPassword === currentPassword) errors.newPassword = "Must be different from the current password";
    if (!confirmPassword) errors.confirmPassword = "Required";
    else if (confirmPassword !== newPassword) errors.confirmPassword = "Passwords do not match";
    if (Object.keys(errors).length) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordSaving(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setPasswordForm(EMPTY_PASSWORD_FORM);
      setPasswordErrors({});
      setPasswordSuccess("Password updated successfully.");
    } catch (error) {
      const data = error?.response?.data;
      const message = data?.message || "Failed to update password";
      setPasswordErrors(data?.field ? { [data.field]: message } : { form: message });
    } finally {
      setPasswordSaving(false);
    }
  };

  useEffect(() => {
    loadAdminProfile();
  }, []);

  const loadAdminProfile = async () => {
    try {
      setFetchingProfile(true);
      const data = await userService.getAdminProfile();
      if (data) setFormData({
        dispatcherName: data.dispatcherName || "",
        dispatcherEmail: data.dispatcherEmail || "",
        dispatcherPhone: data.dispatcherPhone || "",
        salespersonName: data.salespersonName || "",
        salespersonEmail: data.salespersonEmail || "",
        salespersonPhone: data.salespersonPhone || "",
      });
    } catch (error) {
      console.log("Error loading admin profile:", error);
    } finally {
      setFetchingProfile(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const { dispatcherName, dispatcherEmail, dispatcherPhone } = formData;

    if (!dispatcherName || !dispatcherName.trim()) {
      alert("Please enter dispatcher name");
      return;
    }
    if (!dispatcherEmail || !dispatcherEmail.trim()) {
      alert("Please enter dispatcher email");
      return;
    }
    if (!dispatcherPhone || !dispatcherPhone.trim()) {
      alert("Please enter dispatcher phone");
      return;
    }

    setLoading(true);
    try {
      await userService.updateAdminProfile(formData);
      alert("Admin profile updated successfully!");
    } catch (error) {
      console.log("Error updating profile:", error);
      alert(error?.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (fetchingProfile) {
    return (
      <div className="admin-loading">Loading...</div>
    );
  }

  return (
    <div className="admin-settings-page">
      <h1 className="title">Admin Profile</h1>
      <p className="subtitle">Configure dispatcher and salesperson information</p>

      <div className="card">
        <h2 className="card-title">Dispatcher Information</h2>
        <label className="label">Dispatcher Name *</label>
        <input className="input" placeholder="Enter dispatcher name" value={formData.dispatcherName} onChange={(e)=>handleChange('dispatcherName', e.target.value)} disabled={loading} />

        <label className="label">Dispatcher Email *</label>
        <input className="input" placeholder="Enter dispatcher email" value={formData.dispatcherEmail} onChange={(e)=>handleChange('dispatcherEmail', e.target.value)} disabled={loading} />

        <label className="label">Dispatcher Phone *</label>
        <input className="input" placeholder="Enter dispatcher phone" value={formData.dispatcherPhone} onChange={(e)=>handleChange('dispatcherPhone', e.target.value)} disabled={loading} />
      </div>

      <div className="card">
        <h2 className="card-title">Salesperson Information (Optional)</h2>
        <label className="label">Salesperson Name</label>
        <input className="input" placeholder="Enter salesperson name" value={formData.salespersonName} onChange={(e)=>handleChange('salespersonName', e.target.value)} disabled={loading} />

        <label className="label">Salesperson Email</label>
        <input className="input" placeholder="Enter salesperson email" value={formData.salespersonEmail} onChange={(e)=>handleChange('salespersonEmail', e.target.value)} disabled={loading} />

        <label className="label">Salesperson Phone</label>
        <input className="input" placeholder="Enter salesperson phone" value={formData.salespersonPhone} onChange={(e)=>handleChange('salespersonPhone', e.target.value)} disabled={loading} />
      </div>

      <button className="primary-btn" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Saving...' : 'Save Admin Profile'}
      </button>

      <form className="card password-card" onSubmit={handlePasswordSubmit} noValidate>
        <h2 className="card-title">Change Password</h2>
        <FormField
          label="Current Password"
          id="admin-current-password"
          type="password"
          autoComplete="current-password"
          value={passwordForm.currentPassword}
          onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
          error={passwordErrors.currentPassword}
          disabled={passwordSaving}
        />
        <FormField
          label="New Password"
          id="admin-new-password"
          type="password"
          autoComplete="new-password"
          value={passwordForm.newPassword}
          onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
          error={passwordErrors.newPassword}
          disabled={passwordSaving}
        />
        <FormField
          label="Confirm New Password"
          id="admin-confirm-password"
          type="password"
          autoComplete="new-password"
          value={passwordForm.confirmPassword}
          onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
          error={passwordErrors.confirmPassword}
          disabled={passwordSaving}
        />
        {passwordErrors.form && <div className="form-field-error">{passwordErrors.form}</div>}
        {passwordSuccess && <div className="password-success">{passwordSuccess}</div>}
        <button className="primary-btn" type="submit" disabled={passwordSaving}>
          {passwordSaving ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
 
