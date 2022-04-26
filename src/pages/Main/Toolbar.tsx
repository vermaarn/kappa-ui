import React, { useEffect, useState } from 'react'
import { VscSearch, VscEdit, VscExport } from "react-icons/vsc"

interface IToolbarProps {
  toolSetter: React.Dispatch<React.SetStateAction<string>>
}

const Toolbar: React.FC<IToolbarProps> = (props) => {

  const [currentRefTool, setCurrentRefTool] = useState(0);

  useEffect(() => {

  }, [])

  return (
    <div className="flex flex-col w-12 h-full px-1 pt-2 space-y-2 bg-gray-100">
      {[VscSearch, VscEdit, VscExport].map((Icon, idx) => {
        return (
          <button
            onClick={() => setCurrentRefTool(idx)}
            className={`flex text-center justify-middle text-black p-1 rounded-md ${idx === currentRefTool ? "bg-gray-400" : "hover:bg-gray-300"
              }`}
          >
            <div className={`mx-auto my-1 text-black`}>{<Icon />} </div>
          </button>
        );
      })}
    </div>
  )
}

export default Toolbar