let ioInstance = null;

export const initSocket = (io) => {
    ioInstance = io;
};

export const getIO = () => {
    if (!ioInstance) {
        throw new Error("Socket.IO no inicializado");
    }
    return ioInstance;
};
