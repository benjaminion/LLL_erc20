pragma solidity ^0.4.0;

contract Token {
	event Transfer(address indexed _from, address indexed _to, uint256 _value);
	event Approval(address indexed _owner, address indexed _spender, uint256 _value);

	function name() constant returns (string tokenName);
	function symbol() constant returns (string tokenSymbol);
	function decimals() constant returns (uint tokenDecimals);
	function totalSupply() constant returns (uint256 supply);
	function balanceOf(address _owner) constant returns (uint256 balance);
	function transfer(address _to, uint256 _value) returns (bool success);
	function transferFrom(address _from, address _to, uint256 _value) returns (bool success);
	function approve(address _spender, uint256 _value) returns (bool success);
	function allowance(address _owner, address _spender) constant returns (uint256 remaining);
}

contract StandardToken is Token {

    uint256 constant supply = 100000;
    uint256 constant tokenDecimals = 2;
    string constant tokenSymbol = "BEN";
    string constant tokenName = "Ben Token";
    
	mapping (address => uint256) balance;
	mapping (address =>
		mapping (address => uint256)) m_allowance;

    modifier onlyGoodData() {
        require(msg.data.length % 32 == 4);
        _;
    }

    function StandardToken() {
		balance[msg.sender] = supply;
	}

	function balanceOf(address _account) constant returns (uint) {
		return balance[_account];
	}

	function name() constant returns (string) {
		return tokenName;
	}

	function symbol() constant returns (string) {
		return tokenSymbol;
	}

	function decimals() constant returns (uint) {
		return tokenDecimals;
	}

	function totalSupply() constant returns (uint) {
		return supply;
	}

	function transfer(address _to, uint256 _value) onlyGoodData() returns (bool success)    
    {
		return doTransfer(msg.sender, _to, _value);
	}

	function transferFrom(address _from, address _to, uint256 _value) onlyGoodData() returns (bool)
    {
		if (m_allowance[_from][msg.sender] >= _value) {
			if (doTransfer(_from, _to, _value)) {
				m_allowance[_from][msg.sender] -= _value;
			}
			return true;
		} else {
			revert();
		}
	}

	function doTransfer(address _from, address _to, uint _value) internal returns (bool success)
    {
		if (balance[_from] >= _value && balance[_to] + _value >= balance[_to]) {
            if (_value > 0) {
               balance[_from] -= _value;
			   balance[_to] += _value;
			   Transfer(_from, _to, _value);
            }
			return true;
		} else {
			revert();
		}
	}

	function approve(address _spender, uint256 _value) onlyGoodData() returns (bool success)
    {
        if (_value > supply) {
           revert();
        }
        // Avoid "front-running" attack
        if (_value > 0 && m_allowance[msg.sender][_spender] > 0) {
           revert();
        }
        m_allowance[msg.sender][_spender] = _value;
		Approval(msg.sender, _spender, _value);
		return true;
	}

	function allowance(address _owner, address _spender) constant returns (uint256) {
		return m_allowance[_owner][_spender];
	}
}
