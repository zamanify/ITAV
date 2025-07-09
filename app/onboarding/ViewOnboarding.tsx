import { ArrowRight } from "lucide-react-native";
import React from "react";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { Separator } from "../../components/ui/separator";

export const ViewOnboarding = (): JSX.Element => {
  // Progress steps data
  const progressSteps = [
    { id: "person", label: "Person", step: "1/3", active: true },
    { id: "vanner", label: "Vänner", step: "2/3", active: false },
    { id: "grupper", label: "Grupper", step: "3/3", active: false },
  ];

  // Form fields data
  const formFields = [
    [
      { label: "Förnamn", value: "Pelle" },
      { label: "Efternamn", value: "Nyman" },
    ],
    [
      { label: "Gatuadress", value: "Linnégatan..." },
      { label: "Postnummer", value: "11524" },
    ],
    [
      { label: "Stad", value: "Stockholm" },
      { label: "Epost", value: "pelle@bossma" },
    ],
    [
      { label: "Mobil", value: "0705353534" },
      { label: "Lösenord", value: "SärlekErBest123!" },
    ],
  ];

  return (
    <div className="flex flex-col items-start relative bg-m-3white min-h-screen">
      {/* Status bar */}
      <div className="flex flex-col items-start gap-2.5 relative self-stretch w-full">
        <div className="flex h-[52px] items-end justify-between px-6 py-2.5 relative self-stretch w-full">
          <div className="relative w-fit [font-family:'Roboto',Helvetica] font-medium text-m3syslighton-surface text-sm tracking-[0.14px] leading-5 whitespace-nowrap">
            9:30
          </div>

          <div className="relative w-[46px] h-[17px]">
            <div className="w-[33px] top-0 left-0 absolute h-[17px]">
              <div className="absolute w-[17px] h-[17px] top-0 left-0">
                <img
                  className="h-3.5 top-px absolute w-[17px] left-0"
                  alt="Signal icon"
                  src="/path.svg"
                />
              </div>

              <img
                className="absolute w-[17px] h-[17px] top-0 left-4"
                alt="Signal"
                src="/signal.png"
              />
            </div>

            <img
              className="absolute w-2 h-[15px] top-px left-[38px]"
              alt="Battery"
              src="/battery.svg"
            />
          </div>

          <img
            className="absolute w-6 h-6 top-[18px] left-[183px]"
            alt="Camera cutout"
            src="/camera-cutout.svg"
          />
        </div>
      </div>

      {/* Header with logo and menu */}
      <div className="flex items-end gap-[25px] p-4 relative self-stretch w-full">
        <div className="flex items-center gap-4 relative flex-1 grow">
          <div className="flex flex-col w-[120px] items-start gap-2.5 h-[55px] relative">
            <img
              className="self-stretch w-full object-cover h-[55px] relative"
              alt="Logo"
              src="/logo.png"
            />
          </div>
        </div>

        {/* Hamburger menu */}
        <div className="inline-flex flex-col items-start gap-[5px] relative">
          <div className="relative w-[22px] h-[3px] bg-[#001f27] rounded-[100px]" />
          <div className="relative w-[22px] h-[3px] bg-[#001f27] rounded-[100px]" />
          <div className="relative w-[22px] h-[3px] bg-[#001f27] rounded-[100px]" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-start justify-end gap-4 pt-4 pb-0 px-4 relative self-stretch w-full flex-1">
        <div className="flex flex-col items-start gap-7 pt-5 pb-6 px-5 relative self-stretch w-full rounded-[40px_40px_0px_0px] bg-[linear-gradient(180deg,rgba(3,193,222,1)_0%,rgba(149,0,194,1)_100%)]">
          {/* Heading */}
          <div className="flex items-start gap-2 relative self-stretch w-full">
            <div className="flex items-center gap-2.5 relative flex-1">
              <h1 className="relative flex-1 mt-[-1.00px] [font-family:'Helvetica_Neue-Bold',Helvetica] font-bold text-white text-[38px] tracking-[0] leading-10">
                Först, några <br />
                snabba frågor.
              </h1>
            </div>
          </div>

          {/* Progress tabs */}
          <div className="flex-col items-start gap-2.5 flex relative self-stretch w-full">
            <div className="items-center gap-1.5 flex relative self-stretch w-full">
              {progressSteps.map((step, index) => (
                <div
                  key={step.id}
                  className="flex flex-col items-start gap-1 relative flex-1"
                >
                  <div
                    className={`relative w-fit mt-[-1.00px] [font-family:'Helvetica_Neue-Bold',Helvetica] font-bold ${step.active ? "text-[#02f1e7]" : "text-white"} text-sm text-center tracking-[0] leading-[17px] whitespace-nowrap`}
                  >
                    {step.label} {step.step}
                  </div>
                  <div
                    className={`${step.active ? "bg-[#02f1e7]" : "bg-white"} relative self-stretch w-full h-1.5`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Form fields */}
          <div className="flex flex-col items-start gap-5 relative self-stretch w-full">
            <div className="flex-col items-start gap-3.5 flex relative self-stretch w-full">
              {formFields.map((row, rowIndex) => (
                <div
                  key={`row-${rowIndex}`}
                  className="items-start gap-2.5 flex relative self-stretch w-full"
                >
                  {row.map((field, fieldIndex) => (
                    <div
                      key={`field-${rowIndex}-${fieldIndex}`}
                      className="flex flex-col items-start gap-2.5 relative flex-1"
                    >
                      <div className="flex flex-col items-start justify-center gap-[35px] relative self-stretch w-full">
                        <div className="relative w-fit mt-[-1.00px] [font-family:'Helvetica_Neue-Bold',Helvetica] font-bold text-white text-xl tracking-[0] leading-5 whitespace-nowrap">
                          {field.label}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 relative self-stretch w-full">
                        <Separator
                          orientation="vertical"
                          className="relative w-0.5 h-[47px] bg-white"
                        />
                        <div className="h-5 whitespace-nowrap overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:1] [-webkit-box-orient:vertical] relative flex-1 [font-family:'Helvetica_Neue-Light',Helvetica] font-light text-[#ffffff80] text-3xl tracking-[0] leading-5">
                          {field.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* GDPR Checkbox */}
              <div className="items-center gap-3.5 pt-4 pb-8 px-0 flex relative self-stretch w-full">
                <Checkbox
                  id="gdpr"
                  className="relative w-[33px] h-[33px] border-2 border-solid border-white rounded-none"
                />
                <label
                  htmlFor="gdpr"
                  className="relative w-[348px] h-[33px] mt-[-1.00px] mr-[-77.00px] [font-family:'Helvetica_Neue-Light',Helvetica] font-light text-white text-[15px] tracking-[0] leading-[25px]"
                >
                  <span className="[font-family:'Helvetica_Neue-Light',Helvetica] font-light text-white text-[15px] tracking-[0] leading-[25px]">
                    Jag godkänner{" "}
                  </span>
                  <span className="underline">GDPR </span>
                  <span className="[font-family:'Helvetica_Neue-Light',Helvetica] font-light text-white text-[15px] tracking-[0] leading-[25px]">
                    och{" "}
                  </span>
                  <span className="underline">integritetspolicy</span>
                </label>
              </div>

              {/* Submit button */}
              <Button
                variant="outline"
                className="flex items-center justify-center gap-2.5 px-5 py-4 relative self-stretch w-full rounded-[56px] border-2 border-solid border-white bg-transparent h-auto"
              >
                <div className="flex items-center justify-center gap-2.5 relative flex-1">
                  <div className="relative flex-1 h-6 mt-[-1.00px] [font-family:'Helvetica_Neue-Bold',Helvetica] font-bold text-white text-xl tracking-[0] leading-5 whitespace-nowrap">
                    Fyll i för att gå vidare
                  </div>
                </div>
                <div className="inline-flex items-center gap-2.5 relative">
                  <ArrowRight size={26} color="white" />
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
