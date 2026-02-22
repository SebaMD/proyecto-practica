import { ArrowRight } from "lucide-react";

const colorMap = {
    sky: {
        border: "hover:border-sky-500",
        bg: "bg-sky-100",
        text: "text-sky-700",
    },
    blue: {
        border: "hover:border-blue-500",
        bg: "bg-blue-100",
        text: "text-blue-700",
    },
    purple: {
        border: "hover:border-purple-500",
        bg: "bg-purple-100",
        text: "text-purple-700",
    },
};

function HomeCard({ icon, counter, text, color = "sky", btnText, onClick, flexOne = true }) {
    const Icon = icon;
    const c = colorMap[color] || colorMap.sky;

    return (
        <div
            className={`flex flex-row ${flexOne ? "flex-1" : ""} gap-4 justify-between items-center px-4 py-6 border border-gray-200 rounded-lg transition-all shadow-sm hover:shadow-md ${c.border}`}
        >
        <span className={`${c.bg} p-2.5 rounded-full`}>
            <Icon className={`${c.text} h-5 w-5`} />
        </span>

        <div className="flex flex-col">
            <span className={`text-xl font-bold ${c.text}`}>{counter}</span>
            <span className="text-md text-gray-500">{text}</span>
        </div>

        <button
            onClick={onClick}
            className={`flex flex-row gap-2 ml-auto ${c.text} font-semibold text-md items-center transition-all hover:underline hover:cursor-pointer active:scale-95`}
        >
            {btnText} <ArrowRight className="h-4 w-4 mt-0.5" />
        </button>
        </div>
    );
}

export default HomeCard;