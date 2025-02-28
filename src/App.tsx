import React, { useState, useEffect } from 'react';

const App = () => {
  const [players, setPlayers] = useState([]);
  const [managers, setManagers] = useState([
    { id: 1, name: 'Manager 1', budget: 100, players: [] },
    { id: 2, name: 'Manager 2', budget: 100, players: [] },
    { id: 3, name: 'Manager 3', budget: 100, players: [] },
    { id: 4, name: 'Manager 4', budget: 100, players: [] }
  ]);
  const [currentManager, setCurrentManager] = useState(0);
  const [draftStarted, setDraftStarted] = useState(false);
  const [positionFilter, setPositionFilter] = useState('All');
  const [gradeFilter, setGradeFilter] = useState('All');

  // Generate sample players on initial load
  useEffect(() => {
    generateSamplePlayers();
  }, []);

  const generateSamplePlayers = () => {
    const positions = ['GK', 'DEF', 'MID', 'FWD'];
    const grades = ['A+', 'A', 'B', 'C', 'D', 'E', 'F'];
    const newPlayers = [];
    let idCounter = 1;
    
    // Generate exactly 4 goalkeepers
    for (let i = 1; i <= 4; i++) {
      const grade = i === 1 ? 'A' : ['B', 'C', 'D'][Math.floor(Math.random() * 3)]; // One top GK
      newPlayers.push({
        id: idCounter++,
        name: `Goalkeeper ${i}`,
        position: 'GK',
        grade,
        price: calculatePrice('GK', grade),
        selected: false
      });
    }
    
    // Generate 18 defenders
    for (let i = 1; i <= 18; i++) {
      const grade = i === 1 && newPlayers.filter(p => p.grade === 'A+').length < 2 
        ? 'A+' 
        : grades.slice(1)[Math.floor(Math.random() * (grades.length - 1))];
      newPlayers.push({
        id: idCounter++,
        name: `Defender ${i}`,
        position: 'DEF',
        grade,
        price: calculatePrice('DEF', grade),
        selected: false
      });
    }
    
    // Generate 20 midfielders
    for (let i = 1; i <= 20; i++) {
      const grade = i === 1 && newPlayers.filter(p => p.grade === 'A+').length < 2
        ? 'A+' 
        : grades.slice(1)[Math.floor(Math.random() * (grades.length - 1))];
      newPlayers.push({
        id: idCounter++,
        name: `Midfielder ${i}`,
        position: 'MID',
        grade,
        price: calculatePrice('MID', grade),
        selected: false
      });
    }
    
    // Generate 18 forwards
    for (let i = 1; i <= 18; i++) {
      const grade = grades.slice(1)[Math.floor(Math.random() * (grades.length - 1))];
      newPlayers.push({
        id: idCounter++,
        name: `Forward ${i}`,
        position: 'FWD',
        grade,
        price: calculatePrice('FWD', grade),
        selected: false
      });
    }
    
    // Ensure we have exactly 2 A+ players
    const aPlus = newPlayers.filter(p => p.grade === 'A+');
    if (aPlus.length < 2) {
      // Add A+ to a random forward if needed
      const availableForwards = newPlayers.filter(p => p.position === 'FWD' && p.grade !== 'A+');
      const randomIndex = Math.floor(Math.random() * availableForwards.length);
      newPlayers.forEach(player => {
        if (player.id === availableForwards[randomIndex].id) {
          player.grade = 'A+';
          player.price = calculatePrice(player.position, 'A+');
        }
      });
    } else if (aPlus.length > 2) {
      // Downgrade extra A+ players to A
      const extraAPlus = aPlus.slice(2);
      newPlayers.forEach(player => {
        if (extraAPlus.some(p => p.id === player.id)) {
          player.grade = 'A';
          player.price = calculatePrice(player.position, 'A');
        }
      });
    }
    
    setPlayers(newPlayers);
  };

  const calculatePrice = (position, grade) => {
    let basePrice = 0;
    
    switch (grade) {
      case 'A+':
        basePrice = 19 + (Math.floor(Math.random() * 5) * 0.5); // 19-21.5
        break;
      case 'A':
        basePrice = 14 + (Math.floor(Math.random() * 9) * 0.5); // 14-18
        break;
      case 'B':
        basePrice = 10 + (Math.floor(Math.random() * 7) * 0.5); // 10-13
        break;
      case 'C':
        basePrice = 7 + (Math.floor(Math.random() * 5) * 0.5); // 7-9
        break;
      case 'D':
        basePrice = 5 + (Math.floor(Math.random() * 3) * 0.5); // 5-6
        break;
      case 'E':
        basePrice = 4 + (Math.floor(Math.random() * 3) * 0.5); // 4-5
        break;
      case 'F':
        basePrice = 4; // Minimum 4 as requested
        break;
      default:
        basePrice = 4;
    }
    
    // Position-specific adjustments
    if (position === 'FWD' && (grade === 'A+' || grade === 'A')) {
      basePrice += 1.5; // Premium for top forwards
    } else if (position === 'GK') {
      basePrice = Math.max(4, basePrice - 1.5); // Goalkeepers slightly cheaper but minimum 4
    }
    
    return parseFloat(basePrice.toFixed(1)); // Round to one decimal place
  };

  const selectPlayer = (playerId) => {
    if (!draftStarted) return;
    
    const player = players.find(p => p.id === playerId);
    const manager = managers[currentManager];
    
    // Check if manager has enough budget
    if (player.price > manager.budget) {
      alert(`${manager.name} doesn't have enough budget to select this player!`);
      return;
    }
    
    // Check if manager has reached 15 players
    if (manager.players.length >= 15) {
      alert(`${manager.name} already has the maximum of 15 players!`);
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
                  className="border rounded p-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer"
                  onClick={() => selectPlayer(player.id)}
                >
                  <div>
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
                  <h3 className="font-bold">{manager.name}</h3>
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
                    <div key={player.id} className="flex justify-between items-center py-1 border-t">
                      <div>
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
        <p className="mt-2 text-sm text-gray-600">Note: Forward A/A+ prices have a £1.5m premium. Goalkeeper prices have a £1.5m discount (minimum £4.0m).</p>
        <p className="mt-1 text-sm text-gray-600">Each manager selects 15 players with a £100m budget. Players can be selected regardless of position.</p>
      </div>
    </div>
  );
};

export default App;
