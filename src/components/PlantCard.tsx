import { Plant } from "@/data/plants";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobilePlantCard, DesktopPlantCard } from "@/components/plant";

interface PlantCardProps {
  plant: Plant;
}

const PlantCard = ({ plant }: PlantCardProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobilePlantCard plant={plant} />;
  }

  return <DesktopPlantCard plant={plant} />;
};

export default PlantCard;
