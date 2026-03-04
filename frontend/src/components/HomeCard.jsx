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
        <button
            type="button"
            onClick={onClick}
            className={`group flex flex-row ${flexOne ? "flex-1" : ""} gap-4 justify-between items-center px-4 py-6 border border-gray-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-lg hover:-translate-y-1 ${c.border} cursor-pointer text-left`}
        >
        <span className={`${c.bg} p-2.5 rounded-full`}>
            <Icon className={`${c.text} h-5 w-5`} />
        </span>

        <div className="flex flex-col">
            <span className={`text-xl font-bold ${c.text}`}>{counter}</span>
            <span className="text-md text-gray-500">{text}</span>
        </div>

        <span
            className={`flex flex-row gap-2 ml-auto ${c.text} font-semibold text-md items-center transition-all group-hover:underline`}
        >
            {btnText} <ArrowRight className="h-4 w-4 mt-0.5" />
        </span>
        </button>
    );
}

export default HomeCard;
