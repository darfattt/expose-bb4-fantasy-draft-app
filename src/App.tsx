import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

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
  const [players, setPlayers] = useState([]);
  const [managers, setManagers] = useState([
    { 
      id: 1, 
      name: 'Randy', 
      budget: 100, 
      players: [],
      image: '/manager_randy.png' 
    },
    { 
      id: 2, 
      name: 'Ilham', 
      budget: 100, 
      players: [],
      image: '/manager_ilham.png'
    },
    { id: 3, name: 'APH', budget: 100, players: [], image: '/manager_aph.png' },
    { id: 4, name: 'Darfat', budget: 100, players: [], image: '/manager_darfat.png' }
  ]);
  const [currentManager, setCurrentManager] = useState(0);
  const [draftStarted, setDraftStarted] = useState(false);
  const [positionFilter, setPositionFilter] = useState('All');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    loadPlayersFromCSV();
  }, []);

  const loadPlayersFromCSV = async () => {
    try {
      const response = await fetch('/player-list.csv');
      
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
        complete: (results) => {

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

  const selectPlayer = (playerId) => {
    if (!draftStarted) return;
    
    const player = players.find(p => p.id === playerId);
    const manager = managers[currentManager];
    
    // Budget check
    if (player.price > manager.budget) {
      setAlertMessage(`${manager.name} needs £${player.price - manager.budget}m more to buy ${player.name}`);
      setShowAlert(true);
      return;
    }
    
    // Position limit check
    const positionCounts = {
      'GK': getPlayerCountByPosition(manager.players, 'GK'),
      'DEF': getPlayerCountByPosition(manager.players, 'DEF'),
      'MID': getPlayerCountByPosition(manager.players, 'MID'),
      'FWD': getPlayerCountByPosition(manager.players, 'FWD')
    };
    
    const positionLimits = {
      'GK': 1,
      'DEF': 5,
      'MID': 5,
      'FWD': 4
    };
    
    if (positionCounts[player.position] >= positionLimits[player.position]) {
      setAlertMessage(`${manager.name} can't have more than ${positionLimits[player.position]} ${player.position} players`);
      setShowAlert(true);
      return;
    }
    
    // Check if manager has reached 15 players
    if (manager.players.length >= 15) {
      setAlertMessage(`${manager.name} already has the maximum of 15 players!`);
      setShowAlert(true);
      return;
    }
    
    // Update player selection status
    const updatedPlayers = players.map(p => 
      p.id === playerId ? { ...p, selected: true } : p
    );
    
    // Update manager budget and add player to manager's team
    const updatedManagers = managers.map((m, index) => {
      if (index === currentManager) {
        return {
          ...m,
          budget: parseFloat((m.budget - player.price).toFixed(1)),
          players: [...m.players, player]
        };
      }
      return m;
    });
    
    setPlayers(updatedPlayers);
    setManagers(updatedManagers);
    setCurrentManager((currentManager + 1) % 4); // Move to next manager
  };

  const startDraft = () => {
    setDraftStarted(true);
  };

  const getPlayerCountByPosition = (managerPlayers, position) => {
    return managerPlayers.filter(p => p.position === position).length;
  };

  const getBadgeColor = (grade) => {
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

  // Filter players based on both position and grade filters
  const filteredPlayers = players.filter(p => {
    const positionMatch = positionFilter === 'All' || p.position === positionFilter;
    const gradeMatch = gradeFilter === 'All' || p.grade === gradeFilter;
    return !p.selected && positionMatch && gradeMatch;
  });

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {showAlert && (
        <AlertModal 
          message={alertMessage}
          onClose={() => setShowAlert(false)}
        />
      )}
      <h1 className="text-3xl font-bold mb-4">Expose BB.4.0 Fantasy Draft App</h1>
      
      {!draftStarted ? (
        <div className="mb-6">
          <button 
            onClick={startDraft} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Start Draft
          </button>
        </div>
      ) : (
        <div className="mb-6 bg-blue-100 p-4 rounded">
          <h2 className="text-xl font-semibold">Current Drafter: {managers[currentManager].name}</h2>
          <p className="text-lg">Budget Remaining: £{managers[currentManager].budget}m</p>
          <p className="text-sm">Players: {managers[currentManager].players.length}/15</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <h2 className="text-2xl font-bold mb-4">Available Players</h2>
          
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
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map(player => (
                <div 
                  key={player.id} 
                  className="border rounded p-3 flex items-center hover:bg-gray-50 cursor-pointer gap-4"
                  onClick={() => selectPlayer(player.id)}
                >
                  <img 
                    src={player.image} 
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
            {managers.map((manager, index) => (
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
                    £{manager.budget}m
                  </span>
                </div>
                
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm">
                    Players: {manager.players.length}/15
                  </div>
                  <div className="text-sm">
                    {getPlayerCountByPosition(manager.players, 'GK')} GK | 
                    {getPlayerCountByPosition(manager.players, 'DEF')} DEF | 
                    {getPlayerCountByPosition(manager.players, 'MID')} MID | 
                    {getPlayerCountByPosition(manager.players, 'FWD')} FWD
                  </div>
                </div>
                
                <div className="max-h-48 overflow-y-auto">
                  {manager.players.map(player => (
                    <div key={player.id} className="flex items-center py-1 border-t gap-2">
                      <img 
                        src={player.image}
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
        <h2 className="text-xl font-bold mb-2">Player Grade Price Ranges</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 flex items-center justify-center rounded text-white ${getBadgeColor('A+')}`}>A+</span>
            <span>£19.0m - £21.5m</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 flex items-center justify-center rounded text-white ${getBadgeColor('A')}`}>A</span>
            <span>£14.0m - £18.0m</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 flex items-center justify-center rounded text-white ${getBadgeColor('B')}`}>B</span>
            <span>£10.0m - £13.0m</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 flex items-center justify-center rounded text-white ${getBadgeColor('C')}`}>C</span>
            <span>£7.0m - £9.0m</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 flex items-center justify-center rounded text-white ${getBadgeColor('D')}`}>D</span>
            <span>£5.0m - £6.0m</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 flex items-center justify-center rounded text-white ${getBadgeColor('E')}`}>E</span>
            <span>£4.0m - £5.0m</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 flex items-center justify-center rounded text-white ${getBadgeColor('F')}`}>F</span>
            <span>£4.0m</span>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Note: Forward A/A+ prices have a £1.5m premium. Goalkeeper prices have a £1.5m discount (minimum £4.0m).
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Squad Requirements: 1 GK, 5 DEF, 5 MID, 4 FWD (15 total players)
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Each manager has a £100m budget. Players must be selected according to position limits.
        </p>
      </div>
    </div>
  );
};

export default App;
