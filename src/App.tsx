import './App.css';

export default function App() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold font-heading text-primary mb-4">
        VDAT — Athletic Intelligence
      </h1>
      <p className="text-muted-foreground mb-6">
        Volleyball Data Analysis Toolkit for Volleyball Australia
      </p>
      <div className="glass-card rounded-xl p-6 max-w-md">
        <p className="stat-number text-3xl text-foreground">2,847</p>
        <p className="text-xs text-muted-foreground mt-1">Total Records</p>
      </div>
    </div>
  );
}