// info.jsx

import { Info } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

export function InfoPopover({mensagem_info}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="p-1 rounded-full hover:bg-gray-100">
          <Info className="w-5 h-5 text-blue-600" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-96 text-justify">
        <h4 className="font-bold text-blue-600 mb-2">Ajuda</h4>
        <p dangerouslySetInnerHTML={{ __html: mensagem_info }} /> {/* permite colocar comentário em HTML */}
      </PopoverContent>
    </Popover>
  )
}
