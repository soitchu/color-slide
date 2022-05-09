module.exports = class LinkedList{
    constructor(){
        this.head = null;
        this.tail = null;
        this.length = 0;
    }

    shift(value){
        let node = this.newNode(value);
        if(this.head == null){
            this.head = node;
            this.tail = node;
        }else{
            this.head.prev = node;
            node.next = this.head;
            this.head = node;
            
        }
        this.length++;
    }
    
    push(value){
        let node = this.newNode(value);
        if(this.head == null){
            this.head = node;
            this.tail = node;
        }else{
            this.tail.next = node;
            node.prev = this.tail;
            this.tail = node;
        }
        this.length++;
        return node;
    }
    newNode(value, next = null, tail = null){
        let node = {};
        node.value = value;
        node.next = next;
        node.prev = tail;
        return node;
    }

    deleteHead(){
        if(this.length == 1){
            this.head = null;
            this.tail = null;
            this.length--;

        }else if(this.head == null || this.head.next == null){
            return;
        }else{
            this.head = this.head.next;
            this.head.prev = null;
            this.length--;
        }
    }

    removeElement(node){
        if(node == this.head){
            this.deleteHead();
        }else if(node == this.tail){
            this.deleteTail();
        }else if(this.length >= 3){
            node.prev.next = node.next;
            node.next.prev = node.prev;
            this.length--;
        } 
    }

    nodeAtIndex(index){
        let i = 0;
        let currentNode = this.head;
        while(i < index){
            currentNode = currentNode.next;
            i++;
        }
        return currentNode;
    }

    value(index){
        if(index >= this.length){
            return null;
        }
        return this.nodeAtIndex(index).value;
    }
    removeElementAtIndex(index){
        if(index >= this.length){
            return null;
        }
        let currentNode = this.nodeAtIndex(index);        
        this.removeElement(currentNode);
    }


    deleteTail(){
        if(this.length == 1){
            this.tail = null;
            this.head = null;
            this.length--;

        }else if(this.tail == null || this.tail.prev == null){
            return;
        }else{
            this.tail = this.tail.prev;
            this.tail.next = null;
            this.length--;
        }
    }
}
