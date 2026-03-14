"use strict";

import nodemailer from "nodemailer";
import { EMAIL_USER, EMAIL_PASS } from "../config/configEnv.js";

export const sendEmail = async (to, subject, text, html) => {
    try {
        if (!EMAIL_USER || !EMAIL_PASS) {
            throw new Error("EMAIL_USER o EMAIL_PASS no están configurados");
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: `"Sistema Licencias" <${EMAIL_USER}>`,
            to,
            subject,
            text,
            html,
        };

        const info = await transporter.sendMail(mailOptions);

        return {
            success: true,
            messageId: info.messageId,
        };
    } catch (error) {
        console.error("[Email Service] Error al enviar correo:", error.message);
        throw new Error("Error enviando el correo: " + error.message);
    }
};

const formatDate = (date) =>
    new Date(date).toLocaleDateString("es-CL", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

const formatTime = (date) =>
    new Date(date).toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
    });

export const sendAccountStatusEmail = async (user, accountStatus) => {
    if (!user?.email) return;

    let subject = "";
    let text = "";
    let html = "";

    if (accountStatus === "aprobado") {
        subject = "Solicitud de registro aprobada";
        text = `Hola ${user.username}, tu solicitud de registro fue aprobada. Ya puedes iniciar sesión en el sistema. también recibirás otro correo cuando se definan las fechas y horarios.`;
        html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #16a34a; color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                    <h2 style="margin: 0;">Solicitud aprobada</h2>
                </div>
                <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                    <p>Hola <strong>${user.username}</strong>,</p>
                    <p>Tu solicitud de registro fue aprobada.</p>
                    <p>Ya puedes iniciar sesión en el sistema con tu correo registrado.</p>
                    <p>además, recibirás otro correo cuando se definan las fechas y horarios del periodo de inscripcion.</p>
                    <p style="margin-top: 24px;">Atentamente,<br><strong>Sistema de Licencias</strong></p>
                </div>
            </div>
        `;
    }

    if (accountStatus === "rechazado") {
        subject = "Solicitud de registro rechazada";
        text = `Hola ${user.username}, tu solicitud de registro fue rechazada. Si necesitas más  información, contacta a administración.`;
        html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #dc2626; color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                    <h2 style="margin: 0;">Solicitud rechazada</h2>
                </div>
                <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                    <p>Hola <strong>${user.username}</strong>,</p>
                    <p>Tu solicitud de registro fue rechazada.</p>
                    <p>Si necesitas más  información, contacta a administración.</p>
                    <p style="margin-top: 24px;">Atentamente,<br><strong>Sistema de Licencias</strong></p>
                </div>
            </div>
        `;
    }

    if (!subject) return;

    await sendEmail(user.email, subject, text, html);
};

export const sendPeriodScheduledEmail = async (user, period) => {
    if (!user?.email || !period) return;

    const startDate = new Date(period.startDate);
    const closingDate = new Date(period.closingDate);

    const subject = "Periodo programado en el sistema";
    const text = [
        `Hola ${user.username}.`,
        "",
        "El periodo se encontrara activo",
        `desde el ${formatDate(startDate)} a las ${formatTime(startDate)}.`,
        `hasta el ${formatDate(closingDate)} a las ${formatTime(closingDate)}.`,
        "",
        "Atentamente,",
        "Sistema de Licencias",
    ].join("\n");
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #2563eb; color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                <h2 style="margin: 0;">Periodo programado</h2>
            </div>
            <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <p>Hola <strong>${user.username}</strong>,</p>
                <p style="margin: 0 0 6px 0;">El periodo se encontrara activo</p>
                <p style="margin: 0 0 4px 0;">desde el <strong>${formatDate(startDate)}</strong> a las <strong>${formatTime(startDate)}</strong>.</p>
                <p style="margin: 0;">hasta el <strong>${formatDate(closingDate)}</strong> a las <strong>${formatTime(closingDate)}</strong>.</p>
                <p style="margin-top: 24px;">Atentamente,<br><strong>Sistema de Licencias</strong></p>
            </div>
        </div>
    `;

    await sendEmail(user.email, subject, text, html);
};

export const sendPeriodScheduledNotifications = async (users, period) => {
    if (!Array.isArray(users) || users.length === 0 || !period) return;

    await Promise.allSettled(users.map((user) => sendPeriodScheduledEmail(user, period)));
};
