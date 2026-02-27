import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import FacetSidebar, { type FacetSidebarProps } from "./FacetSidebar";

interface MobileFacetDrawerProps extends FacetSidebarProps {
  totalResults: number;
}

const MobileFacetDrawer = ({
  totalResults,
  ...sidebarProps
}: MobileFacetDrawerProps) => {
  const { activeCount } = sidebarProps;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros
          {activeCount > 0 && (
            <Badge variant="secondary" className="h-4 min-w-[16px] text-[10px] px-1">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[300px] sm:w-[340px] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
          <SheetTitle className="text-base">Filtros</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 py-3">
          <FacetSidebar {...sidebarProps} />
        </ScrollArea>

        <SheetFooter className="px-4 py-3 border-t border-border">
          <SheetClose asChild>
            <Button className="w-full">
              Ver {totalResults} resultado{totalResults !== 1 ? "s" : ""}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default MobileFacetDrawer;
