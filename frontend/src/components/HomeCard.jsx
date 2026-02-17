import { ArrowRight } from "lucide-react";

function HomeCard({ icon, counter, text, color, btnText, onClick, flexOne = true }) {
    const Icon = icon;
    return (
        <div
            className={`flex flex-row ${flexOne? "flex-1" : ""} gap-4 justify-between items-center px-4 py-6 border border-gray-200 rounded-lg transition-all shadow-sm hover:shadow-md hover:border-${color}-500`}
            >
            <span className={`bg-${color}-100 p-2.5 rounded-full`}>
                <Icon className={`text-${color}-700 h-5 w-5`} />
            </span>
            <div className="flex flex-col">
                <span className={`text-xl font-bold text-${color}-700`}>{counter}</span>
                <span className="text-md text-gray-500">{text}</span>
            </div>
            <button
                onClick={onClick}
                className={`flex flex-row gap-2 ml-auto text-${color}-700 font-semibold text-md items-center transition-all hover:underline hover:cursor-pointer active:scale-95`}
            >
                {btnText} <ArrowRight className="h-4 w-4 mt-0.5" />
            </button>
        </div>
    );
}

export default HomeCard;