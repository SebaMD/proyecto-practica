import Swal from "sweetalert2";

// Colores obtenidos de: https://tailwindcss.com/docs/colors
// para mantener el tema con tailwind

export function showErrorAlert(title, text) {
    Swal.fire({
        icon: "error",
        title,
        text,
        confirmButtonText: "Aceptar",
        confirmButtonColor: "oklch(50.5% 0.213 27.518)",
    });
}

export function showSuccessAlert(title, text) {
    Swal.fire({
        icon: "success",
        title,
        text,
        confirmButtonText: "Aceptar",
        confirmButtonColor: "oklch(48.8% 0.243 264.376)",
        timer: 3000,
        timerProgressBar: true,
    });
}

export function showSuccessToast(title) {
    Swal.fire({
        toast: true,
        position: "bottom-end",
        title,
        icon: "success",
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false
    })
}

export function showConfirmAlert(title, text, confirmButtonText = "Aceptar", onConfirm) {
    Swal.fire({
        title,
        text,
        icon: "question",
        showCancelButton: "true",
        confirmButtonColor: "oklch(52.7% 0.154 150.069)",
        cancelButtonColor: "oklch(48.8% 0.243 264.376)",
        confirmButtonText,
        cancelButtonText: "Cancelar",
    }).then((result) => {
        if (result.isConfirmed) {
        onConfirm();
        }
    });
}
