import React from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";

export const LandingPage = (): JSX.Element => {
  return (
    <div className="bg-white flex flex-row justify-center w-full">
      <Card className="w-[485px] h-[1029px] p-0 border-0 rounded-none">
        <CardContent className="p-0 relative h-full">
          {/* Gradient Background */}
          <div className="absolute inset-0 [background:linear-gradient(180deg,rgba(255,145,213,1)_0%,rgba(3,193,222,1)_100%)]" />

          {/* Logo */}
          <div className="absolute top-[17px] left-[15px] w-[138px]">
            <img
              className="w-full h-14 object-cover"
              alt="Logotype VIT"
              src="/logotype-vit.svg"
            />
          </div>

          {/* Hands Illustration */}
          <div className="absolute bottom-0 left-0 w-full">
            <img
              className="w-full h-[276px] object-cover"
              alt="Armar"
              src="/armar.svg"
            />
          </div>

          {/* Main Content */}
          <div className="absolute top-[126px] left-4 w-[452px] flex flex-col">
            {/* Heading */}
            <div className="font-['Unbounded',Helvetica] font-black text-[40px] leading-[45px] mb-10">
              <span className="text-[#a2f3ff] block">
                Välkommen till
                <br />
                It takes a village,
              </span>
              <span className="text-white block">
                appen för oss
                <br />
                som hjälps år.
              </span>
            </div>

            {/* Description */}
            <div className="font-['Unbounded',Helvetica] text-[22px] mt-10">
              <p className="font-light text-white leading-tight mb-8">
                Med It takes a village kan du och de dina be om hjälp och
                erbjuda hjälp. Hjälpen loggas i antal minuter, så att ni kan
                hålla koll på när det är er tur att ta gudsonen till lekparken,
                rasta kompisens hund eller bara erbjuda lite andrum i vardagen.
              </p>

              <p className="font-black text-white leading-[30px] mb-8">
                It takes a village gör det lättare att göra livet lättare.
              </p>

              <p className="font-black text-[#ffd0ed] leading-[30px]">
                Testa gratis i en månad, därefter kostar det 9 kr/mån.
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <div className="absolute bottom-[140px] left-1/2 transform -translate-x-1/2 w-[400px] flex justify-center items-center">
            <Button
              className="w-full h-[94px] bg-transparent border-0 relative"
              style={{ background: "transparent" }}
            >
              <img
                className="absolute inset-0 w-full h-full object-cover"
                alt="Rosa knapp"
                src="/rosa-knapp.svg"
              />
              <span className="relative font-['Unbounded',Helvetica] font-black text-white text-[15px] text-center leading-[18px] z-10">
                Fan vad bra, klart jag är med!
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
