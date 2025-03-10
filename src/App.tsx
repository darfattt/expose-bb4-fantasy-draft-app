import React, { useState, useEffect, DragEvent } from 'react';
import Papa from 'papaparse';

interface Player {
  id: number;
  name: string;
  position: string;
  grade: string;
  price: number;
  image: string;
  selected: boolean;
}

const AlertModal = ({ message, onClose }: { message: string; onClose: () => void }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Warning</h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      <p className="text-gray-600">{message}</p>
      <button
        onClick={onClose}
        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
      >
        OK
      </button>
    </div>
  </div>
);

const App = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [managers, setManagers] = useState([
    { 
      id: 1, 
      name: 'Randy', 
      budget: 101,
      spent: 0,
      players: [] as Player[],
      image: '/manager_randy.png' ,
      order:1
    },
    { 
      id: 2, 
      name: 'Bob9', 
      budget: 101,
      spent: 0,
      players: [] as Player[],
      image: '/manager_ilham.png',
      order:2
    },
    { id: 3, name: 'Apeha10', budget: 101, spent: 0, players: [] as Player[], image: '/manager_aph.png' ,order:3},
    { id: 4, name: 'Darfat', budget: 101, spent: 0, players: [] as Player[], image: '/manager_darfat.png',order:4 }
  ]);
  const [currentManager, setCurrentManager] = useState(0);
  const [draftStarted, setDraftStarted] = useState(false);
  const [positionFilter, setPositionFilter] = useState('All');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [managerPickCounts, setManagerPickCounts] = useState({});
  const [draftHistory, setDraftHistory] = useState<Array<{
    manager: string;
    pickNumber: number;
    pickCount: number;
    player: string;
    position: string;
  }>>([]);
  const [draftMode, setDraftMode] = useState<'linear' | 'snake'>('linear');
  const [currentRound, setCurrentRound] = useState(0);
  const [maxPrice, setMaxPrice] = useState(11);
  const [nameFilter, setNameFilter] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    loadPlayersFromCSV();
  }, []);

  useEffect(() => {
    if (draftStarted && timeLeft > 0 && !isPaused) {
      const interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      setTimerInterval(interval);
      
      return () => clearInterval(interval);
    } else if (timeLeft === 0) {
      skipTurn();
    }
  }, [draftStarted, timeLeft, isPaused]);

  useEffect(() => {
    setTimeLeft(60);
    if (timerInterval) clearInterval(timerInterval);
  }, [currentManager]);

  const loadPlayersFromCSV = async () => {
    try {
      const response = await fetch('/player-list.csv');
      console.log({response})
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
      }

      const csvText = await response.text();

      Papa.parse(csvText, {
        header: true,
        delimiter: ',',
        skipEmptyLines: 'greedy',
        transformHeader: (header) => header.trim(),
        transform: (value) => value.trim(),
        complete: (results: Papa.ParseResult<any>) => {
          if (results.errors.length > 0) {
            console.error('Parsing errors:', results.errors);
          }

          if (!results.data || results.data.length === 0) {
            console.error('No data parsed from CSV');
            return;
          }

          const parsedPlayers = results.data
            .filter(row => {
              const isValid = row.Name && row.Position && row.Grade && row.Price;
              if (!isValid) {
                console.warn('Invalid row:', row);
              }
              return isValid;
            })
            .map((row, index) => ({
              id: index + 1,
              name: row.Name,
              position: row.Position,
              grade: row.Grade,
              price: parseFloat(row.Price),
              image: row.Image || '/face.svg',
              selected: false,
            }));

          setPlayers(parsedPlayers);
        },
        error: (error) => {
          console.error('Papa Parse Error:', error);
        }
      });
    } catch (error) {
      console.error('CSV Loading Error:', error);
    }
  };

  const selectPlayer = (playerId: number) => {
    if (!draftStarted) return;
    
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    
    const manager = managers[currentManager];
    if (manager.players.length >= 17) {
      setAlertMessage(`${manager.name} already has the maximum of 17 players!`);
      setShowAlert(true);
      return;
    }

    // if (manager.name === 'Randy' && player.price > 6.0) {
    //   setAlertMessage(`${manager.name}  cannot buy any player priced higher than £6.0`);
    //   setShowAlert(true);
    //   return;
    // }

    if (player.price > manager.budget) {
      setAlertMessage(`${manager.name} needs £${player.price - manager.budget}m more to buy ${player.name}`);
      setShowAlert(true);
      return;
    }
    
    const positionCounts = {
      'GK': getPlayerCountByPosition(manager.players, 'GK'),
      'DEF': getPlayerCountByPosition(manager.players, 'DEF'),
      'MID': getPlayerCountByPosition(manager.players, 'MID'),
      'FWD': getPlayerCountByPosition(manager.players, 'FWD')
    };
    
    const managerPositionLimits = {
      'Darfat': {
        'GK': 1,
        'DEF': 6,
        'MID': 5,
        'FWD': 5
      },
      'Apeha10': {
        'GK': 1,
        'DEF': 6,
        'MID': 5,
        'FWD': 5
      },
      'Bob9': {
        'GK': 1,
        'DEF': 6,
        'MID': 5,
        'FWD': 5
      },
      'Randy': {
        'GK': 1,
        'DEF': 6,
        'MID': 5,
        'FWD': 5
      }
    };
    
    const managerLimits = managerPositionLimits[manager.name];
    if (positionCounts[player.position] >= managerLimits[player.position]) {
      setAlertMessage(`${manager.name} can't have more than ${managerLimits[player.position]} ${player.position} players`);
      setShowAlert(true);
      return;
    }
    
    if (manager.players.length >= 17) {
      setAlertMessage(`${manager.name} already has the maximum of 17 players!`);
      setShowAlert(true);
      return;
    }
    
    const updatedPlayers = players.map(p => 
      p.id === playerId ? { ...p, selected: true } : p
    );
    
    const updatedManagers = managers.map((m, index) => {
      if (index === currentManager) {
        return {
          ...m,
          budget: parseFloat((m.budget - player.price).toFixed(1)),
          players: [...m.players, player],
          spent: m.spent + player.price
        };
      }
      return m;
    });
    
    setDraftHistory(prev => [
      ...prev,
      {
        manager: managers[currentManager].name,
        pickNumber: prev.length + 1,
        pickCount: prev.length + 1,
        player: player.name,
        position: player.position
      }
    ]);
    
    setPlayers(updatedPlayers);
    setManagers(updatedManagers);

    updateCurrentManager();

    setTimeLeft(60);
  };

  const getPlayerCountByPosition = (managerPlayers: Player[], position: string) => {
    return managerPlayers.filter(p => p.position === position).length;
  };

  const getBadgeColor = (grade: string) => {
    switch(grade) {
      case 'A+': return 'bg-purple-600';
      case 'A': return 'bg-green-600';
      case 'B': return 'bg-green-400';
      case 'C': return 'bg-yellow-300';
      case 'D': return 'bg-orange-300';
      case 'E': return 'bg-red-300';
      case 'F': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const filteredPlayers = players.filter(p => {
    const positionMatch = positionFilter === 'All' || p.position === positionFilter;
    const gradeMatch = gradeFilter === 'All' || p.grade === gradeFilter;
    const priceMatch = p.price <= maxPrice;
    const nameMatch = p.name.toLowerCase().includes(nameFilter.toLowerCase());
    return !p.selected && positionMatch && gradeMatch && priceMatch && nameMatch;
  });

  const forceSkipTurn = () => {

    setDraftHistory(prev => [
      ...prev,
      {
        manager: 'System',
        pickNumber: prev.length + 1,
        pickCount: prev.length + 1,
        player: "SKIPPED",
        position: "-"
      }
    ]);

    updateCurrentManager();

    setTimeLeft(60);
  };
  const skipTurn = () => {
    if (!draftStarted) return;

    setDraftHistory(prev => [
      ...prev,
      {
        manager: managers[currentManager].name,
        pickNumber: prev.length + 1,
        pickCount: prev.length + 1,
        player: "SKIPPED",
        position: "-"
      }
    ]);

    updateCurrentManager();

    setTimeLeft(60);
  };

  const getPositionOrder = (position: string) => {
    switch (position) {
      case 'GK': return 0;
      case 'DEF': return 1;
      case 'MID': return 2;
      case 'FWD': return 3;
      default: return 4;
    }
  };

  const groupAndSortPlayers = (players: Player[]) => {
    const positionOrder = ['GK', 'DEF', 'MID', 'FWD'];
    
    const grouped = players.reduce((acc, player) => {
      if (!acc[player.position]) {
        acc[player.position] = [];
      }
      acc[player.position].push(player);
      return acc;
    }, {} as Record<string, Player[]>);

    Object.values(grouped).forEach(group => {
      group.sort((a, b) => a.name.localeCompare(b.name));
    });

    return positionOrder.filter(pos => grouped[pos]?.length > 0).map(pos => ({
      position: pos,
      players: grouped[pos]
    }));
  };

  const updateCurrentManager = () => {
    if (draftMode === 'linear') {
      // Get managers in their proper order
      const orderedManagers = managers.sort((a, b) => a.order - b.order);
      // Find current manager's position in order
      const currentPosition = orderedManagers.findIndex(m => m === managers[currentManager]);
      // Get next manager in order
      const nextManager = managers.findIndex(m => 
        m === orderedManagers[(currentPosition + 1) % 4]
      );
      setCurrentManager(nextManager);
      const totalPicks = draftHistory.length + 1;
      const round = Math.floor((totalPicks ) / 4); // 0-based round
      setCurrentRound(round + 1);
      return;
    }

    const totalPicks = draftHistory.length + 1;
    const round = Math.floor((totalPicks - 1) / 4); // 0-based round
    const position = (totalPicks - 1) % 4; // 0-based position in round

    // Update current round for UI feedback
    setCurrentRound(round + 1);

    // Get managers in their proper order
    const orderedManagers = managers.sort((a, b) => a.order - b.order);
    
    // Calculate the starting position for this round (0,1,2,3)
    const roundStartPosition = round % 4;
    
    // Calculate the next manager's position
    const nextPosition = (roundStartPosition + position) % 4;
    
    // Find the index in the managers array
    const nextManager = managers.findIndex(m => m === orderedManagers[nextPosition]);
    setCurrentManager(nextManager);
  };

  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {showAlert && (
        <AlertModal 
          message={alertMessage}
          onClose={() => setShowAlert(false)}
        />
      )}
      <h1 className="text-3xl font-bold mb-4">Expose BB.4.0 Fantasy Draft Application</h1>
     
      
      {!draftStarted && (
        <div className="mb-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Draft Mode:
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="draftMode"
                  value="linear"
                  checked={draftMode === 'linear'}
                  onChange={(e) => setDraftMode(e.target.value as 'linear' | 'snake')}
                  className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-sm text-gray-700">
                  Linear Order (1 → 2 → 3 → 4 each round)
                </span>
              </label>
              
              <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="draftMode"
                  value="snake"
                  checked={draftMode === 'snake'}
                  onChange={(e) => setDraftMode(e.target.value as 'linear' | 'snake')}
                  className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-sm text-gray-700">
                  Snake Order (R1: 1→2→3→4, R2: 2→3→4→1, R3: 3→4→1→2, R4: 4→1→2→3)
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Manager Draft Order (Drag to reorder):
            </label>
            <div className="space-y-2">
              {managers.sort((a, b) => a.order - b.order).map((manager, index) => (
                <div
                  key={manager.id}
                  draggable
                  onDragStart={(e: DragEvent<HTMLDivElement>) => {
                    e.dataTransfer.setData('text/plain', manager.id.toString());
                  }}
                  onDragOver={(e: DragEvent<HTMLDivElement>) => {
                    e.preventDefault();
                  }}
                  onDrop={(e: DragEvent<HTMLDivElement>) => {
                    e.preventDefault();
                    const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
                    const draggedManager = managers.find(m => m.id === draggedId);
                    const targetManager = manager;
                    
                    if (draggedManager && targetManager) {
                      const newManagers = managers.map(m => {
                        if (m.id === draggedManager.id) {
                          return { ...m, order: targetManager.order };
                        }
                        if (m.id === targetManager.id) {
                          return { ...m, order: draggedManager.order };
                        }
                        return m;
                      });
                      setManagers(newManagers);
                    }
                  }}
                  className="flex items-center gap-4 p-3 bg-white border rounded shadow-sm cursor-move hover:bg-gray-50"
                >
                  <div className="text-gray-500">#{index + 1}</div>
                  <img
                    src={manager.image}
                    alt={manager.name}
                    className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/default-manager.svg';
                    }}
                  />
                  <div className="font-medium">{manager.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {!draftStarted ? (
        <div className="mb-6">
          <button 
            onClick={() => {
              setDraftStarted(true);
              setCurrentRound(1);
              // Find the manager with order 1 to start the draft
              const firstManager = managers.findIndex(m => m.order === 1);
              setCurrentManager(firstManager);
              if(draftMode !== 'linear'){
                console.log('skip turn..');
                forceSkipTurn();
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Start Draft
          </button>
        </div>
      ) : (
        <div className="mb-6 bg-blue-100 p-4 rounded">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src={managers[currentManager].image}
                alt={managers[currentManager].name}
                className="w-16 h-16 rounded-full object-cover border-2 border-blue-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/default-manager.svg';
                }}
              />
              <div>
                <h2 className="text-xl font-semibold">Current Drafter</h2>
                <p className="text-lg">{managers[currentManager].name}</p>
                {draftMode === 'snake' && (
                  <p className="text-sm text-gray-600">
                    Round {currentRound} (starts with {managers.find(m => m.order === (currentRound - 1) % 4 + 1)?.name})
                  </p>
                )}
                {draftMode === 'linear' && (
                  <p className="text-sm text-gray-600">
                    Round {currentRound} 
                  </p>
                )}
                <div className="flex gap-4 mt-1">
                  <span className="text-sm bg-blue-200 px-2 py-1 rounded">
                    Budget: £{managers[currentManager].budget}m
                  </span>
                  <span className="text-sm bg-blue-200 px-2 py-1 rounded">
                    Players: {managers[currentManager].players.length}/17
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    className="text-gray-200"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                  <circle
                    className={`text-${timeLeft <= 10 ? 'red-500' : 'blue-500'}`}
                    strokeWidth="8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                    strokeDasharray={`${(timeLeft / 60) * 251} 251`}
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-bold">
                  {timeLeft}
                </div>
              </div>
              <div>
                <div className="flex flex-col gap-2 mt-1 items-center">
                  <button 
                    onClick={togglePause} 
                    className={`px-4 py-2 rounded ${isPaused ? 'bg-green-500' : 'bg-red-500'} text-white`}
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={skipTurn}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    Skip Turn
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <h2 className="text-2xl font-bold mb-4">Available Players</h2>
          
          <div className="mb-4">
            <div className="font-semibold mb-2">Search by Name:</div>
            <div className="relative">
              <input
                type="text"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder="Search player name..."
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {nameFilter && (
                <button
                  onClick={() => setNameFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
            {nameFilter && filteredPlayers.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">
                No players found matching "{nameFilter}"
              </p>
            )}
          </div>
          
          <div className="mb-4">
            <div className="font-semibold mb-2">Position Filter:</div>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {['All', 'GK', 'DEF', 'MID', 'FWD'].map(pos => (
                <button 
                  key={pos}
                  className={`px-3 py-1 rounded border ${positionFilter === pos ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-100'}`}
                  onClick={() => setPositionFilter(pos)}
                >
                  {pos}
                </button>
              ))}
            </div>
            
            <div className="font-semibold mb-2">Grade Filter:</div>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {['All', 'A+', 'A', 'B', 'C', 'D', 'E', 'F'].map(grade => (
                <button 
                  key={grade}
                  className={`px-3 py-1 rounded border ${gradeFilter === grade ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-100'}`}
                  onClick={() => setGradeFilter(grade)}
                >
                  {grade}
                </button>
              ))}
            </div>
            
            <div className="font-semibold mb-4">
              <div className="font-semibold mb-2">Maximum Price:</div>
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 w-12">£0.0m</span>
                  <input
                    type="range"
                    min="0"
                    max="11"
                    step="0.5"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm text-gray-600 w-16">£{maxPrice}m</span>
                </div>
                <div className="text-sm text-gray-600 text-center">
                  Showing players up to £{maxPrice}m
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredPlayers.length > 0 ? (
              groupAndSortPlayers(filteredPlayers).map(group => (
                <React.Fragment key={group.position}>
                  <div className="col-span-2 bg-gray-100 py-2 px-4 font-semibold text-gray-700 rounded mt-2 first:mt-0">
                    {group.position}
                  </div>
                  {group.players.map(player => (
                    <div 
                      key={player.id} 
                      className="border rounded p-3 flex flex-col md:flex-row items-center hover:bg-gray-50 cursor-pointer gap-4"
                      onClick={() => selectPlayer(player.id)}
                    >
                      <img 
                        src={`/players/${player.name}.png`}
                        alt={player.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/face.svg';
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{player.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded text-white ${getBadgeColor(player.grade)}`}>
                            {player.grade}
                          </span>
                        </div>
                        <div className="text-gray-600 text-sm">{player.position}</div>
                      </div>
                      <div className="text-lg font-bold">£{player.price}m</div>
                    </div>
                  ))}
                </React.Fragment>
              ))
            ) : (
              <div className="col-span-2 p-4 text-center text-gray-500">
                No players match the selected filters
              </div>
            )}
          </div>
        </div>
        
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-4">Teams</h2>
          
          <div className="space-y-4">
            {managers.sort((a, b) => a.order - b.order).map((manager, index) => (
              <div 
                key={manager.id} 
                className={`border rounded p-3 ${index === currentManager && draftStarted ? 'border-blue-500 bg-blue-50' : ''}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <img 
                      src={manager.image}
                      alt={manager.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-blue-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/default-manager.svg';
                      }}
                    />
                    <h3 className="font-bold">{manager.name}</h3>
                  </div>
                  <span className={`${manager.budget < 10 ? 'text-red-500' : ''} font-semibold`}>
                     £{manager.spent}m / £{manager.budget}m 
                  </span>
                </div>
                
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm">
                    Players: {manager.players.length}/17
                  </div>
                  <div className="text-sm">
                    {getPlayerCountByPosition(manager.players, 'GK')} GK | 
                    {getPlayerCountByPosition(manager.players, 'DEF')} DEF | 
                    {getPlayerCountByPosition(manager.players, 'MID')} MID | 
                    {getPlayerCountByPosition(manager.players, 'FWD')} FWD
                  </div>
                </div>
                
                <div className="max-h-100 overflow-y-auto">
                  {manager.players
                    .sort((a, b) => getPositionOrder(a.position) - getPositionOrder(b.position))
                    .map(player => (
                      <div key={player.id} className="flex items-center py-1 border-t gap-2">
                        <img 
                        src={`/players/${player.name}.png`}
                        alt={player.name}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/face.svg';
                          }}
                        />
                        <div className="flex-1">
                          <span className="text-xs bg-gray-200 px-1 rounded">{player.position}</span> {player.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`w-5 h-5 flex items-center justify-center text-xs rounded text-white ${getBadgeColor(player.grade)}`}>
                            {player.grade}
                          </span>
                          <span>£{player.price}m</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-4 border rounded bg-gray-50">
        <h2 className="text-xl font-bold mb-2">Position Price Guidelines</h2>
        <div className="space-y-2">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Defenders (DEF):</span> Budget-friendly options from £4.0m up to premium picks at £6.5m
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Midfielders (MID):</span> Range from £5.0m for rotation options to £10.0m for elite playmakers
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Forwards (FWD):</span> Starting at £6.0m for squad players up to £11.0m for premium strikers
          </p>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          Squad Requirements per Manager:
        </p>
        <ul className="mt-2 text-sm text-gray-600 space-y-1">
          <li>• Darfat: 1 GK, 6 DEF, 4 MID , 5 FWD (16 total players) + Manager</li>
          <li>• Apeha10: 1 GK, 6 DEF, 5 MID, 4 FWD (16 total players) + Manager</li>
          <li>• Bob9: 1 GK, 6 DEF, 5 MID, 4 FWD (16 total players) + Manager</li>
          <li>• Randy: 1 GK, 6 DEF, 5 MID, 4 FWD (16 total players) + Manager</li>
        </ul>
        <p className="mt-1 text-sm text-gray-600">
          Each manager has a £101m budget. Players must be selected according to position limits.
        </p>
      </div>
      
      <div className="mt-6 p-4 border rounded bg-gray-50">
        <h2 className="text-xl font-bold mb-4">Draft History</h2>
        <div className="space-y-2">
          {draftHistory.map((entry, index) => (
            <div 
              key={index}
              className={`p-2 rounded border flex items-center gap-2 text-sm ${
                entry.player === "SKIPPED" ? 'bg-gray-50' : 'bg-white'
              }`}
            >
              <span className="font-mono text-gray-500 w-12">#{entry.pickNumber}</span>
              <span className="text-gray-500 text-sm">
                (R{Math.floor((entry.pickNumber - 1) / 4) + 1})
              </span>
              <span className="font-semibold min-w-[100px]">{entry.manager}</span>
              {entry.player === "SKIPPED" ? (
                <span className="text-gray-500 italic">Skipped turn</span>
              ) : (
                <span className="text-gray-600">
                  <span className="bg-gray-200 px-1 rounded mx-2">{entry.position}</span>
                  {entry.player}
                </span>
              )}
            </div>
          ))}
          {draftHistory.length === 0 && (
            <div className="text-gray-500 text-center py-4">
              No draft picks yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
