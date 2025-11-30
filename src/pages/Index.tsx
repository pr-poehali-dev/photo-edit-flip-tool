import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HistoryItem {
  imageData: string;
  timestamp: number;
  rotation: number;
}

interface RotatedPiece {
  id: string;
  imageData: string;
  width: number;
  height: number;
  x: number;
  y: number;
  rotation: number;
}

export default function Index() {
  const [image, setImage] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [tool, setTool] = useState<'select' | 'rotate' | 'place'>('select');
  const [rotatedPiece, setRotatedPiece] = useState<RotatedPiece | null>(null);
  const [isDraggingPiece, setIsDraggingPiece] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (image && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
      img.src = image;
    }
  }, [image]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        toast.success('Фото загружено!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        toast.success('Фото загружено!');
      };
      reader.readAsDataURL(file);
    }
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'place') {
      handlePieceMouseDown(e);
      return;
    }
    if (tool !== 'select') return;
    const point = getCanvasCoordinates(e);
    setIsDrawing(true);
    setStartPoint(point);
    setSelection(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'place') {
      handlePieceMouseMove(e);
      return;
    }
    if (!isDrawing || tool !== 'select') return;
    
    const point = getCanvasCoordinates(e);
    const width = point.x - startPoint.x;
    const height = point.y - startPoint.y;
    
    setSelection({
      x: width > 0 ? startPoint.x : point.x,
      y: height > 0 ? startPoint.y : point.y,
      width: Math.abs(width),
      height: Math.abs(height)
    });
  };

  const handleMouseUp = () => {
    if (tool === 'place') {
      handlePieceMouseUp();
      return;
    }
    if (isDrawing) {
      setIsDrawing(false);
      if (selection && selection.width > 10 && selection.height > 10) {
        setTool('rotate');
        toast.success('Область выбрана! Поверните элемент');
      }
    }
  };

  const applyRotation = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !imageRef.current || !selection) return;

    const currentImageData = canvas.toDataURL();
    setHistory(prev => [...prev, {
      imageData: currentImageData,
      timestamp: Date.now(),
      rotation
    }]);

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    const size = Math.max(selection.width, selection.height) * 1.5;
    tempCanvas.width = size;
    tempCanvas.height = size;
    
    tempCtx.save();
    tempCtx.translate(size / 2, size / 2);
    tempCtx.rotate((rotation * Math.PI) / 180);
    tempCtx.drawImage(
      canvas,
      selection.x, selection.y, selection.width, selection.height,
      -selection.width / 2, -selection.height / 2, selection.width, selection.height
    );
    tempCtx.restore();

    ctx.clearRect(selection.x, selection.y, selection.width, selection.height);

    const piece: RotatedPiece = {
      id: Date.now().toString(),
      imageData: tempCanvas.toDataURL(),
      width: size,
      height: size,
      x: selection.x + selection.width / 2 - size / 2,
      y: selection.y + selection.height / 2 - size / 2,
      rotation
    };

    setRotatedPiece(piece);
    setTool('place');
    toast.success('Теперь выбери куда поставить!');
  };

  const placeRotatedPiece = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !rotatedPiece) return;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, rotatedPiece.x, rotatedPiece.y, rotatedPiece.width, rotatedPiece.height);
      setImage(canvas.toDataURL());
      setRotatedPiece(null);
      setSelection(null);
      setRotation(0);
      setTool('select');
      toast.success('Элемент размещён!');
    };
    img.src = rotatedPiece.imageData;
  };

  const handlePieceMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'place' || !rotatedPiece) return;
    
    const point = getCanvasCoordinates(e);
    if (
      point.x >= rotatedPiece.x && point.x <= rotatedPiece.x + rotatedPiece.width &&
      point.y >= rotatedPiece.y && point.y <= rotatedPiece.y + rotatedPiece.height
    ) {
      setIsDraggingPiece(true);
      setDragOffset({
        x: point.x - rotatedPiece.x,
        y: point.y - rotatedPiece.y
      });
    }
  };

  const handlePieceMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingPiece || !rotatedPiece || tool !== 'place') return;
    
    const point = getCanvasCoordinates(e);
    setRotatedPiece({
      ...rotatedPiece,
      x: point.x - dragOffset.x,
      y: point.y - dragOffset.y
    });
  };

  const handlePieceMouseUp = () => {
    setIsDraggingPiece(false);
  };

  const clearSelection = () => {
    setSelection(null);
    setRotation(0);
    setRotatedPiece(null);
    setTool('select');
  };

  const undoLastAction = () => {
    if (history.length > 0) {
      const lastState = history[history.length - 1];
      setImage(lastState.imageData);
      setHistory(prev => prev.slice(0, -1));
      toast.success('Отменено');
    }
  };

  const saveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `rotated-image-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
    toast.success('Изображение сохранено!');
  };

  useEffect(() => {
    if (canvasRef.current && (selection || rotatedPiece)) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx || !imageRef.current) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imageRef.current, 0, 0);

      if (selection && !rotatedPiece) {
        ctx.strokeStyle = '#9b87f5';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);

        ctx.fillStyle = 'rgba(155, 135, 245, 0.1)';
        ctx.fillRect(selection.x, selection.y, selection.width, selection.height);
      }

      if (rotatedPiece) {
        const img = new Image();
        img.onload = () => {
          ctx.save();
          ctx.globalAlpha = 0.9;
          ctx.drawImage(img, rotatedPiece.x, rotatedPiece.y, rotatedPiece.width, rotatedPiece.height);
          ctx.restore();

          ctx.strokeStyle = '#0EA5E9';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(rotatedPiece.x, rotatedPiece.y, rotatedPiece.width, rotatedPiece.height);
        };
        img.src = rotatedPiece.imageData;
      }
    }
  }, [selection, rotatedPiece]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 animate-fade-in">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2 font-handwriting">
            RotateLab ✨
          </h1>
          <p className="text-muted-foreground text-lg">
            Выбирай элемент и поворачивай как захочешь
          </p>
        </header>

        <div className="grid lg:grid-cols-[1fr_350px] gap-6">
          <div className="space-y-6">
            {!image ? (
              <Card
                className="border-2 border-dashed border-primary/50 hover:border-primary transition-colors animate-pulse-glow cursor-pointer"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="p-16 flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 rounded-full gradient-purple flex items-center justify-center mb-6 animate-rotate-in">
                    <Icon name="ImagePlus" size={48} className="text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">Загрузи своё фото</h3>
                  <p className="text-muted-foreground mb-4">
                    Перетащи сюда или кликни для выбора
                  </p>
                  <Button className="gradient-purple hover-lift text-primary-foreground">
                    <Icon name="Upload" size={20} className="mr-2" />
                    Выбрать файл
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-6 glass-effect animate-fade-in">
                <div className="relative overflow-auto max-h-[70vh] rounded-lg bg-muted/20">
                  <canvas
                    ref={canvasRef}
                    className={`max-w-full h-auto ${
                      tool === 'place' ? 'cursor-move' : 'cursor-crosshair'
                    }`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  />
                </div>
              </Card>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <div className="space-y-6 animate-slide-in">
            <Card className="p-6 glass-effect">
              <Tabs value={tool} onValueChange={(v) => setTool(v as 'select' | 'rotate' | 'place')} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="select" className="gap-2">
                    <Icon name="MousePointer2" size={18} />
                    Выделить
                  </TabsTrigger>
                  <TabsTrigger value="rotate" disabled={!selection || tool === 'place'} className="gap-2">
                    <Icon name="RotateCw" size={18} />
                    Повернуть
                  </TabsTrigger>
                  <TabsTrigger value="place" disabled={!rotatedPiece} className="gap-2">
                    <Icon name="Move" size={18} />
                    Разместить
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="select" className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/30 border border-primary/30">
                    <div className="flex items-start gap-3">
                      <Icon name="Info" size={20} className="text-primary mt-1" />
                      <div>
                        <p className="font-medium mb-1">Как использовать:</p>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Нажми и тяни мышкой по фото</li>
                          <li>Выдели нужную область</li>
                          <li>Переключись на "Повернуть"</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                  
                  {selection && (
                    <div className="p-4 rounded-lg gradient-purple text-primary-foreground">
                      <p className="font-medium mb-2">✓ Область выбрана</p>
                      <p className="text-sm opacity-90">
                        {Math.round(selection.width)} × {Math.round(selection.height)} px
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="rotate" className="space-y-6">
                  <div>
                    <label className="text-sm font-medium mb-3 block flex items-center gap-2">
                      <Icon name="RotateCw" size={16} />
                      Угол поворота: {rotation}°
                    </label>
                    <Slider
                      value={[rotation]}
                      onValueChange={(v) => setRotation(v[0])}
                      min={-180}
                      max={180}
                      step={1}
                      className="mb-3"
                    />
                    <Input
                      type="number"
                      value={rotation}
                      onChange={(e) => setRotation(Number(e.target.value))}
                      min={-180}
                      max={180}
                      className="text-center"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRotation(-90)}
                      className="hover-lift"
                    >
                      <Icon name="RotateCcw" size={16} />
                      -90°
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRotation(0)}
                      className="hover-lift"
                    >
                      0°
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRotation(90)}
                      className="hover-lift"
                    >
                      <Icon name="RotateCw" size={16} />
                      90°
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={applyRotation}
                      className="w-full gradient-purple hover-lift text-primary-foreground"
                      size="lg"
                    >
                      <Icon name="ArrowRight" size={20} className="mr-2" />
                      Применить и выбрать место
                    </Button>
                    <Button
                      onClick={clearSelection}
                      variant="outline"
                      className="w-full"
                    >
                      <Icon name="X" size={20} className="mr-2" />
                      Отменить выделение
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="place" className="space-y-6">
                  <div className="p-4 rounded-lg bg-secondary/20 border border-secondary/50">
                    <div className="flex items-start gap-3">
                      <Icon name="Hand" size={20} className="text-secondary mt-1" />
                      <div>
                        <p className="font-medium mb-1">Перетащи элемент:</p>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Нажми на повёрнутый элемент</li>
                          <li>Перетащи его в нужное место</li>
                          <li>Нажми "Зафиксировать"</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  {rotatedPiece && (
                    <div className="p-4 rounded-lg gradient-blue text-white">
                      <p className="font-medium mb-2">🎯 Элемент готов к размещению</p>
                      <p className="text-sm opacity-90">
                        Поворот: {rotatedPiece.rotation}°
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Button
                      onClick={placeRotatedPiece}
                      className="w-full gradient-blue hover-lift text-white"
                      size="lg"
                    >
                      <Icon name="Check" size={20} className="mr-2" />
                      Зафиксировать здесь
                    </Button>
                    <Button
                      onClick={clearSelection}
                      variant="outline"
                      className="w-full"
                    >
                      <Icon name="X" size={20} className="mr-2" />
                      Отменить
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>

            <Card className="p-6 glass-effect space-y-3">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <Icon name="History" size={20} className="text-primary" />
                История ({history.length})
              </h3>
              
              <Button
                onClick={undoLastAction}
                disabled={history.length === 0}
                variant="outline"
                className="w-full hover-lift"
              >
                <Icon name="Undo2" size={18} className="mr-2" />
                Отменить последнее
              </Button>
              
              <Button
                onClick={saveImage}
                disabled={!image}
                className="w-full gradient-blue hover-lift text-white"
              >
                <Icon name="Download" size={18} className="mr-2" />
                Сохранить результат
              </Button>
              
              <Button
                onClick={() => {
                  setImage(null);
                  setSelection(null);
                  setHistory([]);
                  setRotation(0);
                  setTool('select');
                }}
                disabled={!image}
                variant="outline"
                className="w-full hover-lift"
              >
                <Icon name="RefreshCw" size={18} className="mr-2" />
                Новое фото
              </Button>
            </Card>

            <Card className="p-6 glass-effect">
              <h3 className="font-semibold flex items-center gap-2 mb-3 font-handwriting text-xl">
                <Icon name="Sparkles" size={20} className="text-accent" />
                О проекте
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                RotateLab — креативный редактор для экспериментов с фотографиями. 
                Выделяй любой элемент и поворачивай в любую сторону! 
                Идеально для создания необычных композиций.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}