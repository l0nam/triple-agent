import { useEffect, useState } from "react";

const Toast = ({ toasts, setToasts }) => {
  const [visibleToasts, setVisibleToasts] = useState([]);

  // Добавление нового уведомления
  const addToastToVisible = (toast) => {
    const newToast = {
      id: Date.now() + Math.random(), // Уникальный ID
      message: typeof toast === "object" ? toast.message : toast, // Поддержка объекта или строки
      isFading: false,
      persistent: typeof toast === "object" && toast.persistent === true, // Флаг постоянности
    };
    setVisibleToasts((prev) => [newToast, ...prev].slice(0, 5)); // Новое сверху, лимит 5
  };

  // Синхронизация с внешним состоянием toasts
  useEffect(() => {
    if (toasts.length > 0) {
      const latestToast = toasts[toasts.length - 1];
      addToastToVisible(latestToast);
      // Убираем последнее сообщение из toasts, чтобы не накапливать
      setToasts((prev) => prev.slice(0, -1));
    }
  }, [toasts, setToasts]);

  // Управление таймерами для каждого уведомления
  useEffect(() => {
    const timers = visibleToasts
      .filter((toast) => !toast.persistent) // Только для непостоянных
      .map((toast) => {
        const fadeTimer = setTimeout(() => {
          setVisibleToasts((prev) =>
            prev.map((t) => (t.id === toast.id ? { ...t, isFading: true } : t))
          );
        }, 2700);

        const removeTimer = setTimeout(() => {
          setVisibleToasts((prev) => prev.filter((t) => t.id !== toast.id));
        }, 3000);

        return { fadeTimer, removeTimer };
      });

    return () => {
      timers.forEach(({ fadeTimer, removeTimer }) => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      });
    };
  }, [visibleToasts]);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-1">
      {visibleToasts.map((toast, index) => (
        <div
          key={toast.id}
          className={`bg-white/[5%] border-1 border-white/[3%] text-white px-6.5 py-3 rounded-[20px] transform transition-all duration-500 ease-in-out ${
            toast.isFading ? "animate-fade-out" : "animate-slide-in"
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};

export default Toast;