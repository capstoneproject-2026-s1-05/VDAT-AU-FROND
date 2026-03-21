import { Button } from '@/components/ui/button';

export default function App() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold font-heading text-primary mb-4">
        VDAT
      </h1>
      <div className="flex gap-3">
        <Button>Primary Button</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
      </div>
    </div>
  );
}