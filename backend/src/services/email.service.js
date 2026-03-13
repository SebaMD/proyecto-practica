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

export const sendAccountStatusEmail = async (user, accountStatus) => {
    if (!user?.email) return;

    let subject = "";
    let text = "";
    let html = "";

    if (accountStatus === "aprobado") {
        subject = "Solicitud de registro aprobada";
        text = `Hola ${user.username}, tu solicitud de registro fue aprobada. Ya puedes iniciar sesión en el sistema.`;
        html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #16a34a; color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                    <h2 style="margin: 0;">Solicitud aprobada</h2>
                </div>
                <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                    <p>Hola <strong>${user.username}</strong>,</p>
                    <p>Tu solicitud de registro fue aprobada.</p>
                    <p>Ya puedes iniciar sesión en el sistema con tu correo registrado.</p>
                    <p style="margin-top: 24px;">Atentamente,<br><strong>Sistema de Licencias</strong></p>
                </div>
            </div>
        `;
    }

    if (accountStatus === "rechazado") {
        subject = "Solicitud de registro rechazada";
        text = `Hola ${user.username}, tu solicitud de registro fue rechazada. Si necesitas más información, contacta a administración.`;
        html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #dc2626; color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                    <h2 style="margin: 0;">Solicitud rechazada</h2>
                </div>
                <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                    <p>Hola <strong>${user.username}</strong>,</p>
                    <p>Tu solicitud de registro fue rechazada.</p>
                    <p>Si necesitas más información, contacta a administración.</p>
                    <p style="margin-top: 24px;">Atentamente,<br><strong>Sistema de Licencias</strong></p>
                </div>
            </div>
        `;
    }

    if (!subject) return;

    await sendEmail(user.email, subject, text, html);
};
