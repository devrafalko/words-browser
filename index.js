/* global this */

var wordsListing = {
  /* These properties are editable. */
  data:{
    textSample:"",
    initialIgnoreLetterCase:true,
    initialTurboMode:false,
    sortClassesAZ:['fa-sort-alpha-asc','fa-sort-alpha-desc'],
    sortClasses09:['fa-sort-numeric-desc','fa-sort-numeric-asc'],
    extraLetterSet:"ĄąĆćĘęŁłŃńÓóŚśŻżŹź",
    wordsNumber:[10,25,50,150],
    initialWordsNumber:2,
    intervalTime:1,
    elements: ['resultBox','searchbox','clearButton','convertButton',
      'letterCaseButton','stateMessage','countMessage',
      'uniqueMessage','searchInput','sortAZ','sort09',
      'tableList','dialog','wordNumberBox','tableNavig',
      'jumpToBox','jumpToInput','jumpToSubmit','pageTenMinus',
      'pageOneMinus','pageTenPlus','pageOnePlus','tableOptions','turboModeButton','optionPrompt']
  },
  dom:{
    tableTilesAll:document.querySelectorAll('#tableNavig>span'),
    tableTilesNavig:document.querySelectorAll('#tableNavig>span:not(.tile-page)'),
    tableTilesPages:(function(){
      var array = [], nodes = document.querySelectorAll('#tableNavig>span.tile-page');
      for(var i=0;i<nodes.length;i++) array.push(nodes[i]);
      return array;
    })(),
    textBox:document.getElementById('textBox').children[0]
  },
  states:{
    ignoreLetterCase:null,
    interval:null,
    pending:false,
    done:false,
    aborted:false,
    sortMode:""
  },
  computedData:{
    currentCollection:null,
    wordsNumber:this
  },
  run:function(){
    this.setInitialStates();
    this.addListeners();

    window.onload = function(){
      document.body.classList.remove('preload');
    };
  },
  setInitialStates:function(){
    this.initialActions.setDomReferences.call(this);
    this.initialActions.setLetterCaseButton.call(this);
    this.initialActions.setTurboModeButton.call(this);
    this.initialActions.setInitialText.call(this);
    this.initialActions.createTableNavigMap.call(this);
    this.initialActions.generateCopyOptionsElements.call(this);
    this.initialActions.setWordsNumber.call(this);
    this.actions.toggleSortClasses.call(this);
    this.actions.updateStateMessage.call(this);
  },
  initialActions:{
    setWordsNumber:function(){
      this.computedData.wordsNumber = this.data.wordsNumber[this.data.initialWordsNumber];
    },
    setDomReferences:function(){
      for(var i in this.data.elements){
        this.dom[this.data.elements[i]] = document.getElementById(this.data.elements[i]);
      }
    },
    setLetterCaseButton:function(){
      this.dom.letterCaseButton.classList.add(['switch-off','switch-on'][Number(this.data.initialIgnoreLetterCase)]);
      this.states.ignoreLetterCase = this.dom.letterCaseButton.classList.contains('switch-on');
    },
    setTurboModeButton:function(){
      this.dom.turboModeButton.classList.add(['switch-off','switch-on'][Number(this.data.initialTurboMode)]);
      this.states.turboMode = this.dom.turboModeButton.classList.contains('switch-on');
    },
    setInitialText:function(){
      this.dom.textBox.value = this.data.textSample;
    },
    createTableNavigMap:function(){
      this.computedData.tableMap = [];
      this.dom.tableTilesPages.forEach((function(item,iter){
        this.computedData.tableMap.push({
          tile:item,
          value:iter+1
        });
      }).bind(this));
    },
    generateCopyOptionsElements:function(){
      var map = {
        tableWords:'Kopiuj wszystkie słowa',
        pageWords:'Kopiuj słowa z danej strony',
        table:'Kopiuj tabelę',
        page:'Kopiuj stronę'
      };
      this.computedData.copyOptionElements = {};
      for(var name in map){
        var option = document.createElement('LI');
        option.textContent = map[name];
        this.computedData.copyOptionElements[name] = option;
      }
    }
  },
  addListeners:function(){
    this.events.onConvert = this.events.onConvert.bind(this);
    this.events.onAbort = this.events.onAbort.bind(this);
    this.events.onOptionsOpen = this.events.onOptionsOpen.bind(this);

    this.dom.textBox.addEventListener('input',this.events.onTextInsert.bind(this));
    this.dom.convertButton.addEventListener('click',this.events.onConvert);
    this.dom.clearButton.addEventListener('click',this.events.onClear.bind(this));
    this.dom.letterCaseButton.addEventListener('click',this.events.onUpperIgnore.bind(this));
    this.dom.turboModeButton.addEventListener('click',this.events.onTurboMode.bind(this));
    this.dom.searchInput.addEventListener('input',this.events.onSearchWord.bind(this));
    this.dom.sortAZ.addEventListener('click',this.events.onAlphabeticalSort.bind(this));
    this.dom.sort09.addEventListener('click',this.events.onNumericalSort.bind(this));
    this.dom.jumpToInput.addEventListener('input',this.events.onJumpToValidation.bind(this));
    this.dom.jumpToInput.addEventListener('keydown',(function(event){
      if(event && event.keyCode && event.keyCode === 13) this.events.onJumpToPage.call(this);
    }).bind(this));
    this.dom.jumpToSubmit.addEventListener('click',this.events.onJumpToPage.bind(this));
    this.dom.wordNumberBox.addEventListener('click',this.events.onPageNumberChange.bind(this));
    this.dom.tableTilesAll.forEach((function(tile){
      tile.addEventListener('click',this.events.onChangeTablePage.bind(this,tile));
    }).bind(this));
    this.dom.tableList.addEventListener('click',this.events.onCellCopy.bind(this));
    this.dom.tableOptions.addEventListener('click',this.events.onOptionsOpen);
  },
  events:{
    onConvert:function(){
      if(!this.dom.textBox.value.length) return;
      if(this.states.done && !this.states.aborted && !this.states.textModified){
        this.actions.updateStateMessage.call(this,"Wprowadź inny tekst.");
        return;
      }
      
      this.states.aborted = false;
      this.states.pending = true;
      this.states.done = false;
      this.states.textModified = false;
      
      this.computedData.wordsMap = {};
      this.dom.resultBox.style.display = "none";
      
      this.actions.switchConvertAbort.call(this,'abort');
      this.actions.updateStateMessage.call(this,'Trwa konwertowanie tekstu...');

      var extraSet = this.data.extraLetterSet;
      var setExtra = typeof extraSet === 'string' && extraSet.length ? extraSet:"";
      var regString = "[A-Za-z0-9"+setExtra+"]+(-[A-Za-z0-9"+setExtra+"]+)*([’'][A-Za-z0-9"+setExtra+"]+(-[A-Za-z0-9"+setExtra+"]+)*)?";
      var regExp = new RegExp(regString,'g');
      var wordList = this.dom.textBox.value.match(regExp);
      var wordsNumber = wordList ? wordList.length:0;
      var wordIter = 0;
      var uniqueWords = 0;
      var ignoreLetterCase = this.states.ignoreLetterCase;
      var declension = this.actions.computeDeclension(wordsNumber,["słowo","słowa","słów"]);

      this.actions.updateStateMessage.call(this,"Tekst zawiera " + wordsNumber + " " + declension + ".");
      this.dom.countMessage.style.display = "block";

      switch(this.states.turboMode){
        case true:
          this.actions.updateCountMessage.call(this,wordIter,'Trwa obliczanie...');
          this.dom.uniqueMessage.style.display = "none";
          setTimeout((function(){
            while(true){
              if(!wordList||!wordList.length||this.states.aborted){
                postPendingActions.call(this);
                break;
              }
              generateWordsMap.call(this);
            }
            this.dom.uniqueMessage.style.display = "block";
            this.actions.updateCountMessage.call(this,wordIter);
            this.actions.updateUniqueMessage.call(this,uniqueWords);
          }).bind(this),1);
          break;
        case false:
          this.dom.uniqueMessage.style.display = "block";
          this.interval = setInterval((function(){
            if(!wordList||!wordList.length||this.states.aborted){
              clearInterval(this.interval);
              postPendingActions.call(this);
              return;
            }
            generateWordsMap.call(this);
            this.actions.updateCountMessage.call(this,wordIter);
            this.actions.updateUniqueMessage.call(this,uniqueWords);
          }).bind(this),this.data.intervalTime);
          break;
      }

      function generateWordsMap(){
        var currentWord = wordList.shift();
        if(ignoreLetterCase) currentWord = currentWord.toLowerCase();
        if(this.computedData.wordsMap[currentWord]){
          this.computedData.wordsMap[currentWord]++;
        } else {
          this.computedData.wordsMap[currentWord] = 1;
          uniqueWords++;
        }
        wordIter++;
      }

      function postPendingActions(){
        this.states.pending = false;
        this.states.done = true;

        this.actions.switchConvertAbort.call(this,'convert');
        this.actions.generateSortableWordsLists.call(this);
        this.actions.generateSortableSearchMaps.call(this);
        this.actions.generateWordsNumberButtons.call(this);
        this.dom.resultBox.style.display = "block";
      }

    },
    onAbort:function(){
      this.states.aborted = true;
    },
    onClear:function(){
      if(this.states.pending === true) return;
      this.dom.textBox.value = "";
      this.actions.resetView.call(this);
    },
    onTextInsert:function(){
      this.states.textModified = true;
      if(this.states.pending) return;
      this.actions.resetView.call(this);
    },
    onUpperIgnore:function(){
      this.actions.switchButton.call(this,'letterCaseButton','ignoreLetterCase');
      this.states.textModified = !this.states.textModified;
    },
    onTurboMode:function(){
      if(this.states.pending) return;
      this.actions.switchButton.call(this,'turboModeButton','turboMode');
    },
    onSearchWord:function(){
      var searchText = typeof this.dom.searchInput.value === "string" ? this.dom.searchInput.value:"";
      if(!searchText.length){
        var findList = "wordsList" + this.states.sortMode;
        this.computedData.currentCollection = this.computedData[findList];
        return this.actions.generateWordsNumberButtons.call(this);
      }

      var numericalMode = this.states.sortMode === "09" || this.states.sortMode === "90";
      var mapName = numericalMode ? 'searchMapNumerical':"searchMap" + this.states.sortMode;
      var map = this.computedData[mapName];
      var filteredMap = filterMap.call(this);
      if(filteredMap === null){
        this.computedData.currentCollection = [];
        return this.actions.generateWordsNumberButtons.call(this);
      }

      this.computedData.currentCollection = buildCollection.call(this,filteredMap,searchText);
      this.actions.generateWordsNumberButtons.call(this);

      function filterMap(){
        if(!numericalMode){
          return retrieveBranch(map);
        } else {
          var filteredList = {};
          for(var i in map){
            var numberMap = map[i];
            var filteredMap = retrieveBranch(numberMap);
            if(filteredMap!==null) filteredList[i] = filteredMap;
          }
          return Object.keys(filteredList).length ? filteredList:null;
        }
      }

      function retrieveBranch(getMap){
        var currentBranch = getMap;
        for(var letter in searchText){
          if(!currentBranch[searchText[letter]]) return null;
          currentBranch = currentBranch[searchText[letter]];
        }
        return currentBranch;
      }

      function buildCollection(filteredMap,word){
        var collection = [];
        if(!numericalMode){
          build(collection,filteredMap,word);
          return collection;
        } else {
          var numberOccurances = Object.getOwnPropertyNames(filteredMap).sort(function(a,b){
            return a-b;
          });
          if(this.states.sortMode==='90') numberOccurances.reverse();
          for(var i in numberOccurances){
            build(collection,filteredMap[numberOccurances[i]],word);
          }
          return collection;
        }
      }

      function build(collection,map,word){
        var letters = Object.keys(map);
        for(var i=0;i<letters.length;i++){
          if(letters[i]==='self'){
            collection.push(word);
            continue;
          }
          build(collection,map[letters[i]],word + letters[i]);
        }
      }

    },
    onChangeTablePage:function(tile){
      var map = [
        [this.dom.pageTenMinus,-10],
        [this.dom.pageTenPlus,+10],
        [this.dom.pageOneMinus,-1],
        [this.dom.pageOnePlus,+1]
      ];

      var theSamePage = setCurrentPage.call(this);
      if(theSamePage) return;
      hideNavigTiles.call(this);
      this.actions.generateTable.call(this);
      
      function setCurrentPage(){
        var numTiles = this.computedData.tableMap;

        if(tile===null){
          this.computedData.currentTablePage = 1;
          this.computedData.currentActiveTile = 1;
          changeTileNumbering.call(this);
          return;
        }

        if(this.dom.jumpToInput===tile){
          var newPage = Number(this.dom.jumpToInput.value);
          if(this.computedData.currentTablePage === newPage) return true;
          this.computedData.currentTablePage = newPage;
          changeTileNumbering.call(this);
          return;
        }

        for(var i = 0; i < numTiles.length; i++){
          if(numTiles[i].tile===tile){
            var newPage = numTiles[i].value;
            if(this.computedData.currentTablePage === newPage) return true;
            this.computedData.currentTablePage = newPage;
            setActiveTile.call(this,i);
            return;
          }
        }

        for(var i = 0; i < map.length; i++){
          if(map[i][0]===tile){
            var newPage = this.computedData.currentTablePage + map[i][1];
            if(this.computedData.currentTablePage === newPage) return true;
            this.computedData.currentTablePage = newPage;
            changeTileNumbering.call(this);
            return;
          }
        }
      }

      function changeTileNumbering(){
        var current = this.computedData.currentTablePage;
        var active = this.computedData.currentActiveTile;
        var pagesNumber = this.computedData.pageNumber;
        var tileNumber = this.computedData.tableMap.length;
        var minLimit = current-active;
        var maxLimit = current+(tileNumber-1-active);
        var start = minLimit < 1 ? 1:maxLimit > pagesNumber ? pagesNumber - (tileNumber-1):minLimit;
        if(minLimit < 1) setActiveTile.call(this,current-1);
        if(maxLimit > pagesNumber) setActiveTile.call(this,current-start);
        this.computedData.tableMap.forEach(function(o,iter){
          o.value = start + iter;
          o.tile.innerHTML = o.value;
        });
      }

      function setActiveTile(active){
        this.computedData.currentActiveTile = active;
        this.computedData.tableMap.forEach(function(obj,iter){
          obj.tile.classList[iter===active ? "add":"remove"]('active');
        });
      }

      function hideNavigTiles(){
        map.forEach((function(item){
          item[0].style.visibility = setArrowRange.call(this,item[1]) ? "hidden":"visible";
        }).bind(this));
      }

      function setArrowRange(left){
        var current = this.computedData.currentTablePage;
        var pageNum = this.computedData.pageNumber;
        return left>0 ? current+left>pageNum: current+left<1;
      }

    },
    onJumpToValidation:function(event){
      var value = event.target.value;
      var valid = true;

      if(!(/^[0-9]*$/.test(value))) valid = false;
      if(value.length&&(value<1||value>this.computedData.pageNumber)) valid = false;

      this.dom.jumpToInput.classList[valid ? "remove":"add"]("input-invalid");
      this.dom.jumpToSubmit.classList[valid ? "remove":"add"]("input-invalid");
    },
    onJumpToPage:function(){
      if(!this.dom.jumpToInput.value.length) return;
      if(this.dom.jumpToSubmit.classList.contains('input-invalid')) return;
      this.events.onChangeTablePage.call(this,this.dom.jumpToInput);
    },
    onAlphabeticalSort:function(){
      this.states.sortMode = this.states.sortMode==='AZ' ? 'ZA':'AZ';
      this.events.onSearchWord.call(this);
      this.actions.toggleSortClasses.call(this);
    },
    onNumericalSort:function(){
      this.states.sortMode = this.states.sortMode==='90' ? '09':'90';
      this.events.onSearchWord.call(this);
      this.actions.toggleSortClasses.call(this);
    },
    onPageNumberChange:function(event){
      if(event&&event.target&&event.target.nodeName !== "BUTTON") return;
      var clicked = event&&event.target ? event.target:event;
      var number = clicked.innerHTML === "All" ? null:clicked.innerHTML;
      var tiles = clicked.parentElement.children;
      for(var i = 0;i < tiles.length;i++) tiles[i].classList[tiles[i]===clicked ? "add":"remove"]("active");

      this.actions.updatePagesData.call(this,number);
      this.events.onChangeTablePage.call(this,null);
      this.actions.updatePlaceholderPages.call(this);
      this.actions.generateTablePageNavigation.call(this);
      this.actions.renderCopyOptions.call(this);
      this.actions.generateTable.call(this);
    },
    onCellCopy:function(event){
      var c = event.target;
      if(c.nodeName !== "TD" || c.nextSibling === null || c.nodeName !== "TD") return;
      this.actions.copyToClipboard.call(this,event.target.textContent);
    },
    onOptionsOpen:function(){
      this.dom.optionPrompt.style.display = "block";
      this.dom.tableOptions.removeEventListener('click',this.events.onOptionsOpen);
      var bHideOptions = hideOptions.bind(this);

      setTimeout(function(){
        document.body.addEventListener('click',bHideOptions);
      },10);

      function hideOptions(event){
        this.dom.optionPrompt.style.display = "none";
        this.dom.tableOptions.addEventListener('click',this.events.onOptionsOpen);
        document.body.removeEventListener('click',bHideOptions);
        var options = this.computedData.copyOptionElements;
        for(var i in options){
          if(event.target === options[i]){
            chooseOption.call(this,i);
            return;
          }
        }
      }

      function chooseOption(name){
        var collection = this.computedData.currentCollection;
        var copyString = "";
        var multi = name === 'pageWords' || name === 'page';
        var startIndex = multi ? this.computedData.startWordIndex:0;
        var endIndex = multi ? this.computedData.endWordIndex:this.computedData.currentCollection.length;
        var onlyWords = name === 'tableWords' || name === 'pageWords';

        for(var i = startIndex; i < endIndex; i++){
          copyString += collection[i];
          if(!onlyWords){
            copyString += '\t';
            copyString += this.computedData.wordsMap[collection[i]];
          }
          copyString += '\n';
        }
        this.actions.copyToClipboard.call(this,copyString);
      }
    }
  },
  actions:{
    resetView:function(){
      this.actions.updateStateMessage.call(this);
      this.dom.searchInput.value = "";
      this.dom.countMessage.style.display = "none";
      this.dom.uniqueMessage.style.display = "none";
      this.dom.resultBox.style.display = "none";
    },
    switchButton:function(element,state){
      var classes = this.dom[element].classList;
      var modes = ['switch-on','switch-off'];
      var shouldIgnore = classes.contains('switch-on');
      if(shouldIgnore) modes.reverse();
      classes.remove(modes[1]);
      classes.add(modes[0]);
      this.states[state] = !shouldIgnore;
    },
    switchConvertAbort:function(state){
      switch(state){
        case 'abort':
          this.dom.convertButton.removeEventListener('click',this.events.onConvert);
          setTimeout((function(){
            if(this.states.done === true) return;
            this.dom.convertButton.textContent = "Przerwij";
            this.dom.convertButton.addEventListener('click',this.events.onAbort);
          }).bind(this),2000);
          break;
        case 'convert':
          this.dom.convertButton.removeEventListener('click',this.events.onAbort);
          this.dom.convertButton.addEventListener('click',this.events.onConvert);
          this.dom.convertButton.textContent = "Konwertuj";
          break;
      }
    },
    generateTable:function(){
      var list = this.computedData.currentCollection;
      var wordsNumber = this.computedData.wordsNumber;
      var currentPage = this.computedData.currentTablePage;
      var startWord = (currentPage-1) * wordsNumber;
      var endWord = startWord + wordsNumber > list.length ? list.length:startWord + wordsNumber;
      var innerTable = "";
      for(var i = startWord; i < endWord;i++){
        innerTable += "<tr><td>" + list[i] + "</td><td>" + this.computedData.wordsMap[list[i]] + "</td></tr>";
      }
      this.computedData.startWordIndex = startWord;
      this.computedData.endWordIndex = endWord;
      this.dom.tableList.innerHTML = innerTable;
    },
    generateSortableWordsLists:function(){
      this.computedData.wordsList = Object.keys(this.computedData.wordsMap);
      var list = this.computedData.wordsList;
      var map = this.computedData.wordsMap;
      
      this.computedData.currentCollection = list;
      this.computedData.wordsListAZ = list.slice().sort();
      this.computedData.wordsListZA = this.computedData.wordsListAZ.slice().reverse();
      this.computedData.wordsList09 = list.slice().sort(function(a,b){
        if((map[b]<map[a]) || (map[b] === map[a] && b<a)) return 1;
        if((map[b]>map[a]) || (map[b] === map[a] && b>a)) return -1;
        return 0;
      });
      this.computedData.wordsList90 = list.slice().sort(function(a,b){
        if((map[b]<map[a]) || (map[b] === map[a] && b>a)) return -1;
        if((map[b]>map[a]) || (map[b] === map[a] && b<a)) return 1;
        return 0;
      });
    },
    generateSortableSearchMaps:function(){
      var lists = ["wordsList","wordsListAZ",'wordsListZA'];
      var maps = ["searchMap","searchMapAZ","searchMapZA"];
      
      for(var x in lists){
        this.computedData[maps[x]] = {};
        var list = this.computedData[lists[x]];
        var map = this.computedData[maps[x]];
        for(var y in list){
          var word = list[y];
          var current = map;
          for(var z in word){
            current[[word[z]]] = current[[word[z]]] || {};
            current = current[[word[z]]];
          }
          current.self = true;
        }
      }

      this.computedData.searchMapNumerical = {};
      var numMap = this.computedData.searchMapNumerical;
      var wordsMap = this.computedData.wordsMap;
      for(var word in wordsMap){
        numMap[wordsMap[word]] = numMap[wordsMap[word]] || {};
        var current = numMap[wordsMap[word]];
        for(var i in word){
          var letter = word[i];
          current[letter] = current[letter] || {};
          current = current[letter];
        }
        current.self = true;
      }
    },
    updatePlaceholderPages:function(){
      this.dom.jumpToInput.placeholder = "1-"+this.computedData.pageNumber;
    },
    updatePagesData:function(num){
      this.computedData.pageNumber = num === null ? 1:Math.ceil(this.computedData.currentCollection.length/num);
      this.computedData.wordsNumber = num === null ? this.computedData.currentCollection.length:Number(num);
    },
    generateWordsNumberButtons:function(){
      var numberList = this.data.wordsNumber;
      var collection = this.computedData.currentCollection;
      this.dom.wordNumberBox.innerHTML = "";
      
      var addedButtons = false;
      var activeButton = false;
      
      for(var i = 0; i < numberList.length;i++){
        if(numberList[i]<collection.length){
          var button = addButton.call(this,numberList[i]);
          addedButtons = true;
          if(numberList[i] === this.computedData.wordsNumber){
            this.events.onPageNumberChange.call(this,button);
            activeButton = true;
          }
        }
      }

      if(addedButtons){
        var allButton = addButton.call(this,"All");
        if(!activeButton){
          this.events.onPageNumberChange.call(this,allButton);
        }
      } else {
        this.actions.updatePagesData.call(this,null);
        this.events.onChangeTablePage.call(this,null);
        this.actions.updatePlaceholderPages.call(this);
        this.actions.generateTablePageNavigation.call(this);
        this.actions.renderCopyOptions.call(this);
        this.actions.generateTable.call(this);
      }

      function addButton(number){
        var wordButton = document.createElement("BUTTON");
        wordButton.textContent = number;
        wordButton.classList.add('square-button');
        this.dom.wordNumberBox.appendChild(wordButton);
        return wordButton;
      }

    },
    renderCopyOptions:function(){
      var options = this.computedData.pageNumber > 1 ? ['tableWords','pageWords','table','page']:['tableWords','table'];
      this.dom.optionPrompt.innerHTML = "";
      for(var i in options){
         this.dom.optionPrompt.appendChild(this.computedData.copyOptionElements[options[i]]);
      }
    },
    generateTablePageNavigation:function(){
      var pageNum = this.computedData.pageNumber;
      var map = [
        [this.dom.jumpToBox,15],
        [this.dom.pageTenMinus,10],
        [this.dom.pageTenPlus,10],
        [this.dom.pageOneMinus,5],
        [this.dom.pageOnePlus,5]
      ];
      map.forEach((function(item){
        item[0].style.display = pageNum>item[1] ? "block":"none";
      }).bind(this));
      this.dom.tableTilesPages.forEach((function(element,iter){
        element.style.display = pageNum>1&&pageNum>iter ? "block":"none";
      }).bind(this));
    },
    updateStateMessage:function(message){
      var state = this.dom.stateMessage;
      if(message){
        show();
        setMsg(message);
        return;
      }
      var empty = !this.dom.textBox.value.length;
      empty ? show():hide();
      empty ? setMsg("Wprowadź tekst"):setMsg("");
      
      function show(){
        state.style.display = "block";
      }
      function hide(){
        state.style.display = "none";
      }
      
      function setMsg(msg){
        state.innerHTML = msg;
      }
    },
    updateCountMessage:function(num,defaultMessage){
      this.dom.countMessage.innerHTML = defaultMessage ? defaultMessage:"Sprawdzono " + num + " " + this.actions.computeDeclension(num,["słowo","słowa","słów"]) + ".";
    },
    updateUniqueMessage:function(num,defaultMessage){
      this.dom.uniqueMessage.innerHTML = defaultMessage ? defaultMessage:"Znaleziono " + num + " " + this.actions.computeDeclension(num,["unikalne słowo","unikalne słowa", "unikalnych słów"]) + ".";
    },
    computeDeclension:function(num,declensions){
      var strNum = num.toString();
      if(strNum.length>1){
        var lastTwo = strNum.slice(strNum.length-2, strNum.length);
        return lastTwo[0]==="1" ? declensions[2]:+lastTwo[1]>1&&+lastTwo[1]<5 ? declensions[1]:declensions[2];
      } else{
        return strNum==="1" ? declensions[0]:+strNum>1&&+strNum<5 ? declensions[1]:declensions[2];
      }
    },
    toggleSortClasses:function(){
      switch(this.states.sortMode){
        case '':
          reset.call(this,this.dom.sortAZ);
          reset.call(this,this.dom.sort09);
          break;
        case 'AZ':case 'ZA':
          reset.call(this,this.dom.sort09);
          toggle.call(this,this.dom.sortAZ);
          break;
        case '09':case '90':
          reset.call(this,this.dom.sortAZ);
          toggle.call(this,this.dom.sort09);
          break;
      }

        function reset(elem){
          var classes = elem === this.dom.sortAZ ? this.data.sortClassesAZ:this.data.sortClasses09;
          elem.classList.remove(classes[1]);
          elem.classList.add(classes[0]);
        }

        function toggle(elem){
          var classes = elem === this.dom.sortAZ ? this.data.sortClassesAZ:this.data.sortClasses09;
          var toggleClasses = elem.classList.contains(classes[0]) ? classes.slice():classes.slice().reverse();
          elem.classList.remove(toggleClasses[0]);
          elem.classList.add(toggleClasses[1]);
        }
    },
    copyToClipboard:function(text){
      var hiddenBox = document.createElement("TEXTAREA");
      hiddenBox.value = text;
      hiddenBox.style.position = "fixed";
      hiddenBox.style.top = '100%';
      hiddenBox.style.left = '100%';
      document.body.appendChild(hiddenBox);
      hiddenBox.select();
      var state = document.execCommand('copy');
      document.body.removeChild(hiddenBox);
      this.actions.updatePrompt.call(this,state);
    },
    updatePrompt:function(copySuccess){
      var messageBox = this.dom.dialog.children[0];
      messageBox.textContent = copySuccess ? 'Skopiowano do schowka':'Kopiowanie nie powiodło się';
      this.dom.dialog.classList.remove('dialog-hidden');
      this.dom.dialog.classList.add('dialog-visible');
      if(typeof this.states.dialogTimeout === 'number') clearTimeout(this.states.dialogTimeout);
      this.states.dialogTimeout = setTimeout((function(){
        this.dom.dialog.classList.remove('dialog-visible');
        this.dom.dialog.classList.add('dialog-hidden');
      }).bind(this),2000);
    }
  }

};

wordsListing.run();